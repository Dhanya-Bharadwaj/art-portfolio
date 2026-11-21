import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createOrder, loadRazorpay, verifyOrder } from "../api";
import { artist } from "../config";
import { useCart } from "../cart";
import { money } from "../format";

const EMPTY = { name: "", email: "", phone: "", address: "", city: "", state: "", pincode: "" };

const FIELDS = [
  ["name", "Full name", "name", "text", "wide"],
  ["email", "Email", "email", "email", ""],
  ["phone", "Phone", "tel", "tel", ""],
  ["address", "Address", "street-address", "text", "wide"],
  ["city", "City", "address-level2", "text", ""],
  ["state", "State", "address-level1", "text", ""],
  ["pincode", "PIN code", "postal-code", "text", ""],
];

export default function Checkout() {
  const { lines, subtotal, shipping, total, freeShip, shop, clear, closeCheckout } = useCart();
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState("details"); // details | demo | done
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doneId, setDoneId] = useState("");
  const m = (n) => money(n, shop.currency);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeCheckout();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [closeCheckout]);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const finish = async (orderId, payload) => {
    setBusy(true);
    setError("");
    try {
      await verifyOrder({ order_id: orderId, ...payload });
      setDoneId(orderId);
      clear();
      setStep("done");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setError("");
    if (Object.values(form).some((v) => !v.trim())) return setError("Please fill in all the fields.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("That email doesn't look right.");
    setBusy(true);
    try {
      const o = await createOrder({ items: lines.map((l) => ({ id: l.art.id, qty: l.qty })), customer: form });
      setOrder(o);
      if (o.mode === "demo") {
        setStep("demo");
        setBusy(false);
        return;
      }
      if (!(await loadRazorpay())) throw new Error("Couldn't load the payment window. Check your connection and try again.");
      const rz = new window.Razorpay({
        key: o.key_id,
        amount: o.amount,
        currency: o.currency,
        order_id: o.gateway_order_id,
        name: artist.name,
        description: `Order ${o.order_id}`,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: "#CDBEF5" },
        handler: (r) => finish(o.order_id, { razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }),
        modal: { ondismiss: () => setBusy(false) },
      });
      rz.on("payment.failed", () => {
        setError("The payment didn't go through. Please try again or use another method.");
        setBusy(false);
      });
      rz.open();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <motion.div className="co" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Checkout">
      <motion.div className="co-card" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", damping: 24, stiffness: 240 }}>
        {step === "done" ? (
          <div className="done-panel">
            <motion.div className="done-mark" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.1 }} aria-hidden="true">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#2f2a4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </motion.div>
            <h2>Thank you!</h2>
            <p>Your order <strong>{doneId}</strong> is confirmed. I'll be in touch at {form.email} about shipping.</p>
            <button className="btn" onClick={closeCheckout}>Back to the gallery</button>
          </div>
        ) : (
          <>
            <header className="co-head">
              <h2>Checkout</h2>
              <button className="icon-btn" onClick={closeCheckout} disabled={busy}>Close</button>
            </header>

            {lines.length === 0 ? (
              <p className="empty">Your cart is empty.</p>
            ) : (
              <>
              <div className="co-body">
                <section className="co-main">
                  {step === "details" ? (
                    <>
                      <h3>Delivery details</h3>
                      <div className="fields">
                        {FIELDS.map(([key, label, auto, type, span]) => (
                          <label key={key} className={span}>
                            {label}
                            <input value={form[key]} onChange={update(key)} autoComplete={auto} type={type} inputMode={key === "pincode" ? "numeric" : undefined} maxLength={key === "address" ? 300 : 80} />
                          </label>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="demo-box">
                      <h3>Demo payment</h3>
                      <p>The shop is in demo mode, so no real money is charged. Switch on Razorpay to take real payments.</p>
                      <button className="btn" disabled={busy} onClick={() => finish(order.order_id, {})}>
                        {busy ? "Confirming…" : "Complete demo payment"}
                      </button>
                    </div>
                  )}
                  <p className="form-error" role="alert">{error}</p>
                </section>

                <aside className="co-summary">
                  <h3>Order summary</h3>
                  <ul>
                    {lines.map(({ art, qty }) => (
                      <li key={art.id}><span>{art.title}{qty > 1 ? ` × ${qty}` : ""}</span><span>{m(art.price * qty)}</span></li>
                    ))}
                  </ul>
                  <dl className="totals">
                    <div><dt>Subtotal</dt><dd>{m(subtotal)}</dd></div>
                    <div><dt>Shipping</dt><dd>{freeShip ? "Free" : m(shipping)}</dd></div>
                    <div className="grand"><dt>Total</dt><dd>{m(total)}</dd></div>
                  </dl>
                  {step === "details" && (
                    <button className="btn wide" onClick={start} disabled={busy}>
                      {busy ? "Please wait…" : `Pay ${m(total)}`}
                    </button>
                  )}
                </aside>
              </div>
              {step === "details" && (
                <div className="co-paybar">
                  <div><small>Total</small><strong>{m(total)}</strong></div>
                  <button className="btn" onClick={start} disabled={busy}>{busy ? "Please wait…" : "Pay now"}</button>
                </div>
              )}
              </>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
