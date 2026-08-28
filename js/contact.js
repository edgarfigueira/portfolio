(function () {
	"use strict";

	const DEFAULT_RECIPIENT = "up201604568@up.pt";

	function t(key) {
		return window.siteI18n?.t(key) ?? key;
	}

	function recipient() {
		const contactLink = document.querySelector("[data-contact-email]");

		if (contactLink) {
			const href = contactLink.getAttribute("href") || "";

			if (href.toLowerCase().startsWith("mailto:")) {
				const email = href.slice(7).split("?")[0].trim();

				if (email) {
					try {
						return decodeURIComponent(email);
					} catch {
						return email;
					}
				}
			}

			const textEmail = contactLink.textContent?.trim();

			if (textEmail) {
				return textEmail;
			}
		}

		return window.SITE_CONFIG?.profile?.email || DEFAULT_RECIPIENT;
	}

	function fields() {
		return {
			name: document.getElementById("contactName")?.value.trim() || "",

			email: document.getElementById("contactSenderEmail")?.value.trim() || "",

			subject: document.getElementById("contactSubject")?.value.trim() || "",

			message: document.getElementById("contactMessage")?.value.trim() || "",
		};
	}

	function valid(values) {
		const status = document.getElementById("contactStatus");

		if (!values.subject || !values.message) {
			if (status) {
				status.textContent = t("contact_required");
			}

			return false;
		}

		if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
			if (status) {
				status.textContent = t("contact_invalid_email");
			}

			return false;
		}

		if (status) {
			status.textContent = "";
		}

		return true;
	}

	function body(values) {
		const meta = [];

		if (values.name) {
			meta.push(`${t("contact_name")}: ${values.name}`);
		}

		if (values.email) {
			meta.push(`${t("contact_sender_email")}: ${values.email}`);
		}

		if (meta.length) {
			return `${values.message}\n\n—\n${meta.join("\n")}`;
		}

		return values.message;
	}

	function mailto(values) {
		const to = recipient();

		const params = new URLSearchParams({
			subject: values.subject,
			body: body(values),
		});

		return `mailto:${to}?${params.toString()}`;
	}

	function gmail(values) {
		const params = new URLSearchParams({
			view: "cm",
			fs: "1",
			to: recipient(),
			su: values.subject,
			body: body(values),
		});

		return `https://mail.google.com/mail/?${params.toString()}`;
	}

	window.onSiteDataReady(() => {
		const form = document.getElementById("contactForm");
		const gmailButton = document.getElementById("openGmail");

		form?.addEventListener("submit", (event) => {
			event.preventDefault();

			const values = fields();

			if (!valid(values)) {
				return;
			}

			window.location.href = mailto(values);
		});

		gmailButton?.addEventListener("click", () => {
			const values = fields();

			if (!valid(values)) {
				return;
			}

			window.open(gmail(values), "_blank", "noopener,noreferrer");
		});
	});
})();
