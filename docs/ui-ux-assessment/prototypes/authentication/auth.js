(() => {
  const screens = [...document.querySelectorAll(".screen")];
  const navButtons = [...document.querySelectorAll("[data-go]")];
  const toast = document.querySelector(".toast");
  let toastTimer;

  function showMessage(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function navigate(name) {
    screens.forEach((screen) => {
      const active = screen.id === name;
      screen.hidden = !active;
      screen.classList.toggle("active", active);
    });
    navButtons.forEach((button) =>
      button.classList.toggle("selected", button.dataset.go === name)
    );
    const heroCopy = {
      welcome: [
        "La maintenance,<br>en maîtrise.",
        "Votre espace de travail pour des opérations fiables, partout sur le terrain.",
      ],
      signin: [
        "Vos opérations<br>vous attendent.",
        "Connectez-vous à votre espace de maintenance.",
      ],
      signup: [
        "Votre organisation<br>prête à avancer.",
        "Créez votre accès QPM pour démarrer.",
      ],
    }[name];
    document.querySelector("#hero-title").innerHTML = heroCopy[0];
    document.querySelector("#hero-subtitle").textContent = heroCopy[1];
    document.querySelector(".auth-shell").scrollTo(0, 0);
    requestAnimationFrame(() => {
      document.querySelector(`#${name} .content`)?.scrollTo(0, 0);
    });
  }

  navButtons.forEach((button) =>
    button.addEventListener("click", () => navigate(button.dataset.go))
  );
  document.querySelector("[data-back]").addEventListener("click", () => {
    const active = document.querySelector(".screen.active")?.id;
    navigate(active === "signup" ? "signin" : "welcome");
  });
  document.querySelectorAll(".reveal").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.parentElement.querySelector("input");
      input.type = input.type === "password" ? "text" : "password";
      button.setAttribute(
        "aria-label",
        input.type === "password"
          ? "Afficher le mot de passe"
          : "Masquer le mot de passe"
      );
    });
  });
  document
    .querySelectorAll("[data-server]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        showMessage(
          "Le lien conserve le parcours QPM de configuration du serveur."
        )
      )
    );
  document
    .querySelectorAll("[data-message]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        showMessage(button.dataset.message)
      )
    );

  document.querySelectorAll("[data-submit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const type = button.dataset.submit;
      const form = document.querySelector(`[data-form="${type}"]`);
      const status = form.querySelector(".form-status");
      let valid = true;
      form.querySelectorAll(".line-field").forEach((field) => {
        const input = field.querySelector("input");
        const message = field.querySelector(".field-error");
        const value = input.value.trim();
        let error = "";
        if (input.required && !value) error = "Ce champ est obligatoire.";
        else if (
          input.type === "email" &&
          value &&
          (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 255)
        )
          error =
            "Saisissez une adresse e-mail valide (255 caractères maximum).";
        else if (
          ["firstName", "lastName", "companyName"].includes(input.name) &&
          value.length > 255
        )
          error = "255 caractères maximum.";
        else if (
          input.name === "phone" &&
          value &&
          !/^(\+?\d{0,4})?\s?-?\s?(\(?\d{3}\)?)\s?-?\s?(\(?\d{3}\)?)\s?-?\s?(\(?\d{4}\)?)?$/.test(
            value
          )
        )
          error = "Saisissez un numéro de téléphone valide.";
        else if (
          input.name === "password" &&
          type === "signup" &&
          value.length < 12
        )
          error = "Le mot de passe doit contenir au moins 12 caractères.";
        else if (
          input.name === "password" &&
          value.length > (type === "signup" ? 128 : 255)
        )
          error = `Le mot de passe dépasse la limite de ${
            type === "signup" ? 128 : 255
          } caractères.`;
        field.classList.toggle("invalid", Boolean(error));
        message.textContent = error;
        if (error) valid = false;
      });
      if (!valid) {
        status.style.color = "";
        status.textContent = "Vérifiez les champs signalés pour continuer.";
        form.querySelector(".line-field.invalid input")?.focus();
        return;
      }
      status.textContent = "";
      button.disabled = true;
      button.dataset.originalText = button.innerHTML;
      button.innerHTML =
        '<span class="button-spinner" aria-hidden="true"></span>Traitement…';
      await new Promise((resolve) => setTimeout(resolve, 650));
      button.disabled = false;
      button.innerHTML = button.dataset.originalText;
      status.style.color = "#13734b";
      status.textContent =
        type === "signin"
          ? "Prototype uniquement : aucune requête de connexion n’a été envoyée."
          : "Prototype uniquement : aucune inscription n’a été envoyée. La vérification e-mail actuelle reste inchangée.";
    });
  });

  const params = new URLSearchParams(window.location.search);
  const requestedScreen = params.get("screen");
  if (["signin", "signup"].includes(requestedScreen)) navigate(requestedScreen);
  if (requestedScreen === "signup" && params.get("scroll") === "bottom") {
    requestAnimationFrame(() => {
      const form = document.querySelector('[data-form="signup"]');
      form.scrollTop = form.scrollHeight;
    });
  }
})();
