import crypto from "crypto";

const PAYMOB_API_BASE = "https://accept.paymob.com/api";

/**
 * 1. بدء معاملة دفع جديدة على Paymob والحصول على Payment Key
 */
export async function createPaymobOrder(params: {
  amountEgp: number;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  subjectName: string;
  paymentMethod: "CARD" | "WALLET" | "INSTAPAY";
}) {
  const { amountEgp, studentName, studentEmail, studentPhone, subjectName, paymentMethod } = params;

  const apiKey = process.env.PAYMOB_API_KEY;
  if (!apiKey) {
    // محاكاة وضع التطوير المحلي
    return {
      simulated: true,
      paymentUrl: `/api/paymob/mock-pay?amount=${amountEgp}&method=${paymentMethod}`,
      orderId: "MOCK_ORD_" + Math.random().toString(36).substring(7),
    };
  }

  try {
    // الخطوة 1: طلب Auth Token من Paymob
    const authRes = await fetch(`${PAYMOB_API_BASE}/auth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const authData = await authRes.json();
    const token = authData.token;

    // الخطوة 2: تسجيل الطلب Order Registration
    const amountCents = Math.round(amountEgp * 100);
    const orderRes = await fetch(`${PAYMOB_API_BASE}/ecommerce/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: "false",
        amount_cents: amountCents,
        currency: "EGP",
        items: [
          {
            name: subjectName,
            amount_cents: amountCents,
            description: `شراء مادة ${subjectName}`,
            quantity: "1",
          },
        ],
      }),
    });
    const orderData = await orderRes.json();
    const orderId = orderData.id;

    // تحديد الـ Integration ID المناسب لطريقة الدفع
    let integrationId = process.env.PAYMOB_INTEGRATION_ID_CARD;
    if (paymentMethod === "WALLET") {
      integrationId = process.env.PAYMOB_INTEGRATION_ID_WALLET || integrationId;
    } else if (paymentMethod === "INSTAPAY") {
      integrationId = process.env.PAYMOB_INTEGRATION_ID_INSTAPAY || integrationId;
    }

    const nameParts = studentName.trim().split(" ");
    const firstName = nameParts[0] || "Student";
    const lastName = nameParts.slice(1).join(" ") || "Handasa";

    // الخطوة 3: توليد مفتاح الدفع Payment Key
    const keyRes = await fetch(`${PAYMOB_API_BASE}/acceptance/payment_keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderId,
        billing_data: {
          first_name: firstName,
          last_name: lastName,
          email: studentEmail,
          phone_number: studentPhone,
          apartment: "NA",
          floor: "NA",
          street: "NA",
          building: "NA",
          shipping_method: "NA",
          postal_code: "NA",
          city: "Cairo",
          country: "EG",
          state: "Cairo",
        },
        currency: "EGP",
        integration_id: Number(integrationId),
      }),
    });
    const keyData = await keyRes.json();
    const paymentKey = keyData.token;

    // رابط صفحة الدفع الموحدة
    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/your_iframe_id?payment_token=${paymentKey}`;

    return {
      simulated: false,
      paymentUrl,
      orderId: orderId.toString(),
      paymentKey,
    };
  } catch (error) {
    console.error("Paymob Order Creation Error:", error);
    throw error;
  }
}

/**
 * 2. التحقق من توقيع HMAC SHA-512 للـ Webhook الوارد من Paymob
 */
export function verifyPaymobHmac(payload: any, hmacReceived: string): boolean {
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  if (!hmacSecret) return true; // تجاوز في وضع الاختبار بدون مفاتيح

  // الترتيب الأبجدي الدقيق للمتغيرات المعيارية لـ Paymob
  const obj = payload.obj || payload;
  const concatenatedValues = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    obj.order?.id || obj.order,
    obj.owner,
    obj.pending,
    obj.source_data?.pan,
    obj.source_data?.sub_type,
    obj.source_data?.type,
    obj.success,
  ].join("");

  const calculatedHmac = crypto
    .createHmac("sha512", hmacSecret)
    .update(concatenatedValues)
    .digest("hex");

  return calculatedHmac.toLowerCase() === hmacReceived.toLowerCase();
}

/**
 * 3. التأكيد المزدوج (Double-Verification): فحص مباشر لـ API Paymob للتأكد من المعاملة
 */
export async function doubleVerifyTransactionWithPaymob(transactionId: string): Promise<boolean> {
  const apiKey = process.env.PAYMOB_API_KEY;
  if (!apiKey) return true; // محاكاة

  try {
    const authRes = await fetch(`${PAYMOB_API_BASE}/auth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const { token } = await authRes.json();

    const trxRes = await fetch(`${PAYMOB_API_BASE}/acceptance/transactions/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const trxData = await trxRes.json();

    return trxData.success === true && trxData.is_voided === false && trxData.is_refunded === false;
  } catch (error) {
    console.error("Paymob Double Verification Error:", error);
    return false;
  }
}
