type TwilioResult<T> = { ok: true; data: T } | { ok: false; error: string };

type PhoneRecord = {
  sid: string;
  phoneNumber: string;
};

/** Master / parent Twilio credentials for platform-managed subaccounts. */
export function getMessagingMasterCredentials(): { accountSid: string; authToken: string } | null {
  const accountSid = process.env.MESSAGING_MASTER_ACCOUNT_SID ?? process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.MESSAGING_MASTER_AUTH_TOKEN ?? process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid?.trim() || !authToken?.trim()) {
    return null;
  }
  return { accountSid: accountSid.trim(), authToken: authToken.trim() };
}

function authHeader(accountSid: string, authToken: string): string {
  const token = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  return `Basic ${token}`;
}

/** Parent/master credentials act on a child subaccount SID in the URL. */
export async function getAnySmsNumberOnSubaccount(subaccountSid: string): Promise<TwilioResult<PhoneRecord | null>> {
  const creds = getMessagingMasterCredentials();
  if (!creds) {
    return { ok: false, error: "Messaging platform credentials are not configured on the server." };
  }

  return getAnySmsNumberForAccount(subaccountSid, creds.accountSid, creds.authToken);
}

/** Same-account Twilio credentials (user-owned workspace): SID in URL matches auth SID. */
export async function getAnySmsNumberWithUserCredentials(
  accountSid: string,
  authToken: string,
): Promise<TwilioResult<PhoneRecord | null>> {
  const sid = accountSid.trim();
  const token = authToken.trim();
  if (!sid || !token) {
    return { ok: false, error: "Twilio Account SID and Auth Token are required." };
  }
  return getAnySmsNumberForAccount(sid, sid, token);
}

async function getAnySmsNumberForAccount(
  resourceAccountSid: string,
  basicUser: string,
  basicPassword: string,
): Promise<TwilioResult<PhoneRecord | null>> {
  const url =
    `https://api.twilio.com/2010-04-01/Accounts/${resourceAccountSid}/IncomingPhoneNumbers.json` +
    "?PageSize=20";

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: authHeader(basicUser, basicPassword),
      },
    });
    const data = (await res.json()) as {
      incoming_phone_numbers?: Array<{ sid?: string; phone_number?: string; capabilities?: { SMS?: boolean } }>;
      message?: string;
    };

    if (!res.ok) {
      return { ok: false, error: data.message ?? `HTTP ${res.status}` };
    }

    const firstSmsCapable = data.incoming_phone_numbers?.find((n) => n.capabilities?.SMS && n.sid && n.phone_number);
    if (!firstSmsCapable?.sid || !firstSmsCapable.phone_number) {
      return { ok: true, data: null };
    }

    return {
      ok: true,
      data: { sid: firstSmsCapable.sid, phoneNumber: firstSmsCapable.phone_number },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
}

export async function purchaseSmsNumberOnSubaccount(subaccountSid: string): Promise<TwilioResult<PhoneRecord>> {
  const creds = getMessagingMasterCredentials();
  if (!creds) {
    return { ok: false, error: "Messaging platform credentials are not configured on the server." };
  }

  return purchaseSmsNumberForAccount(subaccountSid, creds.accountSid, creds.authToken);
}

export async function purchaseSmsNumberWithUserCredentials(
  accountSid: string,
  authToken: string,
): Promise<TwilioResult<PhoneRecord>> {
  const sid = accountSid.trim();
  const token = authToken.trim();
  if (!sid || !token) {
    return { ok: false, error: "Twilio Account SID and Auth Token are required." };
  }
  return purchaseSmsNumberForAccount(sid, sid, token);
}

async function purchaseSmsNumberForAccount(
  resourceAccountSid: string,
  basicUser: string,
  basicPassword: string,
): Promise<TwilioResult<PhoneRecord>> {
  const country = (process.env.TWILIO_SMS_DEFAULT_COUNTRY ?? "US").trim().toUpperCase();
  const area = process.env.TWILIO_SMS_DEFAULT_AREA_CODE?.trim();
  const query = new URLSearchParams({ PageSize: "1", SmsEnabled: "true" });
  if (area) query.set("AreaCode", area);

  const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${resourceAccountSid}/AvailablePhoneNumbers/${country}/Local.json?${query.toString()}`;

  try {
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: authHeader(basicUser, basicPassword),
      },
    });
    const searchData = (await searchRes.json()) as {
      available_phone_numbers?: Array<{ phone_number?: string }>;
      message?: string;
    };

    if (!searchRes.ok) {
      return { ok: false, error: searchData.message ?? `HTTP ${searchRes.status}` };
    }

    const phone = searchData.available_phone_numbers?.[0]?.phone_number;
    if (!phone) {
      return { ok: false, error: "No available SMS number was found for the configured region." };
    }

    const buyRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${resourceAccountSid}/IncomingPhoneNumbers.json`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader(basicUser, basicPassword),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ PhoneNumber: phone }),
      },
    );

    const buyData = (await buyRes.json()) as { sid?: string; phone_number?: string; message?: string };

    if (!buyRes.ok || !buyData.sid || !buyData.phone_number) {
      return { ok: false, error: buyData.message ?? `HTTP ${buyRes.status}` };
    }

    return {
      ok: true,
      data: { sid: buyData.sid, phoneNumber: buyData.phone_number },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
}
