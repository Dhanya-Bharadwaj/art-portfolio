import { useEffect, useState } from "react";
import { sendMessage } from "../api";
import { artist } from "../config";
import Reveal from "./Reveal";
import SectionTitle from "./SectionTitle";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // "Enquire" buttons on the cards pre-fill the message
  useEffect(() => {
    const onEnquire = (e) =>
      setForm((f) => ({ ...f, message: `Hi! I'm interested in "${e.detail.title}". Could you share the price and availability?` }));
    window.addEventListener("enquire", onEnquire);
    return () => window.removeEventListener("enquire", onEnquire);
  }, []);

  const submit = async () => {
    if (!form.name || !form.email || !form.message) return;
    setStatus("sending");
    try {
      await sendMessage(form);
      setForm({ name: "", email: "", message: "" });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="section contact" id="contact">
      <div className="contact-grid">
        <Reveal dir="left" className="contact-intro">
          <SectionTitle>Say hello</SectionTitle>
          <p>Questions about a piece, a custom request, or just a kind word. Write here or email <a href={`mailto:${artist.email}`}>{artist.email}</a>.</p>
          <a className="btn ghost" href={artist.instagram} target="_blank" rel="noreferrer">Follow {artist.handle}</a>
        </Reveal>
        <Reveal dir="right" className="form-card">
          <div className="form">
            <label>Name<input value={form.name} onChange={update("name")} maxLength={80} autoComplete="name" /></label>
            <label>Email<input type="email" value={form.email} onChange={update("email")} maxLength={120} autoComplete="email" /></label>
            <label>Message<textarea rows={5} value={form.message} onChange={update("message")} maxLength={2000} /></label>
            <button className="btn" onClick={submit} disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send message"}</button>
            <p className="status" role="status">
              {status === "sent" && "Sent. I'll reply soon."}
              {status === "error" && "Couldn't send. Check your connection and try again."}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
