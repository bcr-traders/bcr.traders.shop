export async function sendSms(phone: string, message: string): Promise<void> {
  const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID
  const authToken = process.env.MESSAGE_CENTRAL_AUTH_TOKEN
  const senderId = process.env.MESSAGE_CENTRAL_SENDER_ID ?? 'BCRTRADERS'

  if (!customerId || !authToken) return

  const mobile = phone.replace(/^\+91/, '').replace(/\D/g, '')

  const url = new URL('https://cpaas.messagecentral.com/sms/v3/send')
  url.searchParams.set('customerId', customerId)
  url.searchParams.set('countryCode', '91')
  url.searchParams.set('mobileNumber', mobile)
  url.searchParams.set('message', message)
  url.searchParams.set('senderId', senderId)
  url.searchParams.set('type', 'SMS')

  await fetch(url.toString(), {
    method: 'POST',
    headers: { authToken },
  }).catch(() => {}) // fire-and-forget; don't fail OTP flow on SMS error
}
