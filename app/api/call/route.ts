import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { visitorName, visitorPhone, residentPhone, residentName, email, reason } = await request.json();

    console.log("Call requested:", { visitorName, visitorPhone, residentPhone, residentName });

    // ==========================================
    // 1. LOG THE DATA (Ready for Automation)
    // ==========================================
    try {
      let googleFormData;
      let formUrl;

      if (email && reason) {
        // LEASING LEADS LOGGING
        googleFormData = new URLSearchParams({
          [process.env.ENTRY_LEAD_NAME || '']: visitorName,      
          [process.env.ENTRY_LEAD_PHONE || '']: visitorPhone,      
          [process.env.ENTRY_LEAD_EMAIL || '']: email,            
          [process.env.ENTRY_LEAD_REASON || '']: reason            
        });
        formUrl = process.env.GOOGLE_FORM_URL_LEADS;
      } else {
        // STANDARD GATE LOGGING
        googleFormData = new URLSearchParams({
          [process.env.ENTRY_VISITOR_NAME || '']: visitorName,      
          [process.env.ENTRY_VISITOR_PHONE || '']: visitorPhone,      
          [process.env.ENTRY_RESIDENT_CALLED || '']: residentName        
        });
        formUrl = process.env.GOOGLE_FORM_URL_STANDARD;
      }

      // Only attempt to log if the automation system provided a URL
      if (formUrl) {
        await fetch(formUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: googleFormData.toString()
        });
      }
    } catch (logError) {
      console.error('Logging silently failed.', logError);
    }

    // ==========================================
    // 2. TWILIO CONFIGURATION
    // ==========================================
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_PHONE_NUMBER) {
      console.error("Missing Twilio Environment Variables in Vercel!");
      return NextResponse.json({ error: 'System Setup Incomplete' }, { status: 500 });
    }

    const cleanResidentNumber = residentPhone.replace(/\D/g, '').slice(-10);
    const formattedResidentPhone = `+1${cleanResidentNumber}`;
    const twilioAuthHeader = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    // ==========================================
    // 3. DELIVERY SMS INTERCEPT
    // ==========================================
    if (reason === "Package / Delivery Courier" || residentName === "Leasing Office (Delivery)") {
      try {
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuthHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedResidentPhone, 
            From: TWILIO_PHONE_NUMBER,
            Body: `🚨 GATE ALERT: Delivery driver (${visitorName}) is requesting access at the gate. Connecting call now...`
          }).toString()
        });
      } catch (smsError) {
        console.error("Failed to send Delivery SMS:", smsError);
      }
    }

    // ==========================================
    // 4. TRIGGER THE ACTUAL PHONE CALL
    // ==========================================
    const twiml = `
      <Response>
        <Say>Please wait while we connect your secure call.</Say>
        <Dial callerId="${TWILIO_PHONE_NUMBER}">${formattedResidentPhone}</Dial>
      </Response>
    `;

    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuthHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: visitorPhone, // Twilio calls the visitor first
        From: TWILIO_PHONE_NUMBER,
        Twiml: twiml
      }).toString()
    });

    if (!twilioResponse.ok) {
      const twilioErrorText = await twilioResponse.text();
      console.error("Twilio API Rejected the Call:", twilioErrorText);
      return NextResponse.json({ error: 'Call failed to connect' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Process complete!' });

  } catch (error: any) {
    console.error('Switchboard Crash:', error);
    return NextResponse.json({ error: 'Critical System Crash' }, { status: 500 });
  }
}
