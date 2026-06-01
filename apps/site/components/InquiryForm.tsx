"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function InquiryForm({
  formType,
  productId,
  sourceUrl
}: {
  formType?: "product_inquiry" | "contact" | string;
  productId?: string;
  sourceUrl?: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = new FormData(event.currentTarget);
    const resolvedFormType = formType ?? (productId ? "product_inquiry" : "contact");
    const fields = {
      company: form.get("company"),
      phone: form.get("phone"),
      messenger: form.get("messenger"),
      requirements: form.get("message")
    };
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formType: resolvedFormType,
        subject: productId ? "Product inquiry" : "Contact inquiry",
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        messenger: form.get("messenger"),
        company: form.get("company"),
        message: form.get("message"),
        productId,
        sourceUrl,
        fields,
        fieldLabels: {
          company: "Company",
          phone: "Phone / WhatsApp / WeChat",
          messenger: "Messenger ID",
          requirements: "Product requirements"
        }
      })
    });
    setStatus(response.ok ? "sent" : "error");
    if (response.ok) event.currentTarget.reset();
  }

  return (
    <form className="inquiry-form" onSubmit={onSubmit}>
      <div className="inquiry-field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required />
      </div>
      <div className="inquiry-field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" name="email" required />
      </div>
      <div className="inquiry-field">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" />
      </div>
      <div className="inquiry-field">
        <label htmlFor="phone">Phone / WhatsApp / WeChat</label>
        <input id="phone" name="phone" />
      </div>
      <div className="inquiry-field">
        <label htmlFor="messenger">Messenger ID</label>
        <input id="messenger" name="messenger" />
      </div>
      <div className="inquiry-field">
        <label htmlFor="message">Product requirements</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Enter product details such as size, color, materials, quantity, and other requirements."
          required
        />
      </div>
      <button className="inshow-button" type="submit" disabled={status === "sending"}>
        <Send size={16} />
        <span>{status === "sending" ? "Sending" : "Send inquiry"}</span>
      </button>
      {status === "sent" && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Your inquiry has been received.</p>}
      {status === "error" && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">Submission failed. Please try again.</p>}
    </form>
  );
}
