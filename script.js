const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCy27fGZfzwz2BwLSmsSCSsjfp60FzHW1A",
  projectId: "eda-lp"
};

const FIRESTORE_URL =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

const IBGE_API =
  "https://servicodados.ibge.gov.br/api/v1/localidades";


const FORM_CONFIG = {
  steps: [
    {
      id: "contato",
      type: "contact",
      progressLabel: "Cadastro",
      eyebrow: "Quero saber mais",
      title: "Preencha seus dados",
      subtitle:
        "Nossa equipe entrará em contato para apresentar a oportunidade.",

      fields: [

        {
          type: "text",
          id: "nomeCompleto",
          label: "Nome completo",
          placeholder: "Digite seu nome",
          required: true
        },

        {
          type: "tel",
          id: "whatsapp",
          label: "WhatsApp",
          placeholder: "(00) 00000-0000",
          required: true
        },

        {
          type: "email",
          id: "email",
          label: "E-mail",
          placeholder: "voce@email.com",
          required: true
        },

        {
          type: "city-state",
          id: "cidade",
          label: "Sua Cidade / UF",
          placeholder: "Selecione sua cidade",
          required: true
        },

        {
          type: "text",
          id: "nomeFranqueado",
          label: "Nome do Franqueado que indicou você",
          placeholder: "Digite o nome do franqueado que indicou você",
          required: true
        },

        {
          type: "city-state",
          id: "cidadeFranqueado",
          label: "Cidade / UF do Franqueado que indicou você",
          placeholder: "Selecione a cidade do franqueado",
          required: true
        }

      ],

      privacyText:
        "🔒 Seus dados serão utilizados apenas para contato."
    }
  ]
};


// ============================================================
// ESTADO DA APLICAÇÃO
// ============================================================

const state = {
  profile: "loja",

  data: {
    profile: "loja"
  }
};


// ============================================================
// ELEMENTOS
// ============================================================

const $ = id => document.getElementById(id);

const stepsContainer = $("stepsContainer");
const nextBtn = $("nextBtn");
const backBtn = $("backBtn");
const progressBar = $("progressBar");
const progressText = $("progressText");
const progressLabel = $("progressLabel");


// ============================================================
// MÁSCARA DE TELEFONE
// ============================================================

function applyPhoneMask(input) {

  let value = input.value.replace(/\D/g, "");

  if (value.length <= 2) {

    input.value = value;

  } else if (value.length <= 6) {

    input.value =
      `(${value.slice(0, 2)}) ${value.slice(2)}`;

  } else if (value.length <= 10) {

    input.value =
      `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;

  } else {

    input.value =
      `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;

  }

}


// ============================================================
// CONFIGURAÇÃO DAS MÁSCARAS
// ============================================================

function setupMasks() {

  const phone = $("whatsapp");

  if (!phone) {
    return;
  }

  phone.addEventListener("input", () => {

    applyPhoneMask(phone);

  });

}


// ============================================================
// CACHE DAS UFs
// ============================================================

let statesCache = [];


// ============================================================
// BUSCAR UFs NA API DO IBGE
// ============================================================

async function fetchStates() {

  if (statesCache.length) {
    return statesCache;
  }

  const response = await fetch(
    `${IBGE_API}/estados?orderBy=nome`
  );

  if (!response.ok) {
    throw new Error("Não foi possível carregar os estados.");
  }

  const data = await response.json();

  statesCache = data.map(state => ({
    id: state.id,
    sigla: state.sigla,
    nome: state.nome
  }));

  return statesCache;
}


// ============================================================
// CACHE DAS CIDADES
// ============================================================

const citiesCache = {};


// ============================================================
// BUSCAR CIDADES DE UMA UF
// ============================================================

async function fetchCities(ufSigla) {

  if (!ufSigla) {
    return [];
  }

  const uf = ufSigla.toUpperCase();

  if (citiesCache[uf]) {
    return citiesCache[uf];
  }

  const response = await fetch(
    `${IBGE_API}/estados/${uf}/municipios?orderBy=nome`
  );

  if (!response.ok) {
    throw new Error(
      `Não foi possível carregar as cidades de ${uf}.`
    );
  }

  const data = await response.json();

  citiesCache[uf] = data.map(city => ({
    id: city.id,
    nome: city.nome
  }));

  return citiesCache[uf];
}


// ============================================================
// PREENCHER SELECT DE UF
// ============================================================

async function populateUFSelect(selectId) {

  const select = $(selectId);

  if (!select) {
    return;
  }

  try {

    const states = await fetchStates();

    select.innerHTML = "";

    const defaultOption =
      document.createElement("option");

    defaultOption.value = "";
    defaultOption.textContent = "UF";

    select.appendChild(defaultOption);

    states.forEach(state => {

      const option =
        document.createElement("option");

      option.value = state.sigla;
      option.textContent = state.sigla;

      select.appendChild(option);

    });

  } catch (error) {

    console.error(
      "Erro ao carregar UFs:",
      error
    );

    select.innerHTML =
      `<option value="">Erro ao carregar</option>`;

  }
}


// ============================================================
// PREENCHER SELECT DE CIDADE
// ============================================================

async function populateCitySelect(
  citySelectId,
  ufSelectId
) {

  const citySelect = $(citySelectId);
  const ufSelect = $(ufSelectId);

  if (!citySelect || !ufSelect) {
    return;
  }

  const uf = ufSelect.value;

  // Nenhuma UF selecionada
  if (!uf) {

    citySelect.innerHTML =
      `<option value="">Selecione primeiro a UF</option>`;

    citySelect.disabled = true;

    return;
  }

  // Estado de carregamento
  citySelect.disabled = true;

  citySelect.innerHTML =
    `<option value="">Carregando cidades...</option>`;

  try {

    const cities = await fetchCities(uf);

    citySelect.innerHTML = "";

    const defaultOption =
      document.createElement("option");

    defaultOption.value = "";
    defaultOption.textContent =
      "Selecione sua cidade";

    citySelect.appendChild(defaultOption);

    cities.forEach(city => {

      const option =
        document.createElement("option");

      option.value = city.nome;
      option.textContent = city.nome;

      // Guarda também o ID do IBGE
      option.dataset.ibgeId = city.id;

      citySelect.appendChild(option);

    });

    citySelect.disabled = false;

  } catch (error) {

    console.error(
      "Erro ao carregar cidades:",
      error
    );

    citySelect.innerHTML =
      `<option value="">Erro ao carregar cidades</option>`;

    citySelect.disabled = true;

  }
}


// ============================================================
// CONFIGURAR RELAÇÃO UF → CIDADE
// ============================================================

function setupCityStateFields() {

  const fields = [
    {
      cityId: "cidade",
      ufId: "uf_cidade"
    },
    {
      cityId: "cidadeFranqueado",
      ufId: "uf_cidadeFranqueado"
    }
  ];

  fields.forEach(field => {

    const ufSelect = $(field.ufId);
    const citySelect = $(field.cityId);

    if (!ufSelect || !citySelect) {
      return;
    }

    citySelect.disabled = true;

    citySelect.innerHTML =
      `<option value="">Selecione primeiro a UF</option>`;

    ufSelect.addEventListener("change", async () => {

      // Limpa a cidade anterior
      citySelect.value = "";

      await populateCitySelect(
        field.cityId,
        field.ufId
      );

    });

  });

}


// ============================================================
// RENDERIZAÇÃO DO CAMPO CIDADE / UF
// ============================================================

function renderCityStateField(field) {

  return `
    <div class="field full city-state-field">

      <label for="${field.id}">
        ${field.label}
      </label>

      <div class="city-state-wrapper">

        <select
          id="uf_${field.id}"
          class="uf-select"
          required
          aria-label="UF"
        >
          <option value="">UF</option>
        </select>

        <div class="city-input-wrapper">

          <select
            id="${field.id}"
            name="${field.id}"
            class="city-input"
            required
            disabled
            aria-label="${field.label}"
          >
            <option value="">
              ${field.placeholder}
            </option>
          </select>

        </div>

      </div>

    </div>
  `;

}


// ============================================================
// RENDERIZAÇÃO DOS CAMPOS
// ============================================================

function renderField(field) {

  // Cidade + UF
  if (field.type === "city-state") {

    return renderCityStateField(field);

  }


  // Texto
  if (field.type === "text") {

    return `
      <div class="field">

        <label for="${field.id}">
          ${field.label}
        </label>

        <input
          id="${field.id}"
          name="${field.id}"
          type="text"
          placeholder="${field.placeholder}"
          required
        >

      </div>
    `;

  }


  // E-mail
  if (field.type === "email") {

    return `
      <div class="field">

        <label for="${field.id}">
          ${field.label}
        </label>

        <input
          id="${field.id}"
          name="${field.id}"
          type="email"
          placeholder="${field.placeholder}"
          required
        >

      </div>
    `;

  }


  // Telefone
  if (field.type === "tel") {

    return `
      <div class="field">

        <label for="${field.id}">
          ${field.label}
        </label>

        <input
          id="${field.id}"
          name="${field.id}"
          type="tel"
          placeholder="${field.placeholder}"
          required
        >

      </div>
    `;

  }

  return "";

}


// ============================================================
// RENDERIZAR ETAPA
// ============================================================

function renderStep(step) {

  return `
    <section class="step active">

      <span class="eyebrow">
        ${step.eyebrow}
      </span>

      <h2>
        ${step.title}
      </h2>

      <p class="subtitle">
        ${step.subtitle}
      </p>

      <div class="fields">
        ${step.fields.map(renderField).join("")}
      </div>

      <div class="privacy">
        ${step.privacyText}
      </div>

    </section>
  `;

}


// ============================================================
// RENDERIZAR FORMULÁRIO
// ============================================================

async function renderForm() {

  stepsContainer.innerHTML =
    renderStep(FORM_CONFIG.steps[0]);

  // Carrega as UFs
  await populateUFSelect("uf_cidade");

  await populateUFSelect(
    "uf_cidadeFranqueado"
  );

  // Configura UF → Cidade
  setupCityStateFields();

  // Máscara do WhatsApp
  setupMasks();

  // Progresso
  if (progressBar) {
    progressBar.style.width = "100%";
  }

  if (progressText) {
    progressText.textContent = "1 de 1";
  }

  if (progressLabel) {
    progressLabel.textContent = "Cadastro";
  }

  // Esconde voltar
  if (backBtn) {
    backBtn.style.display = "none";
  }

}


// ============================================================
// VALIDAÇÃO DO FORMULÁRIO
// ============================================================

function validateForm() {

  const nome =
    $("nomeCompleto");

  const whatsapp =
    $("whatsapp");

  const email =
    $("email");

  const cidade =
    $("cidade");

  const uf =
    $("uf_cidade");

  const nomeFranqueado =
    $("nomeFranqueado");

  const cidadeFranqueado =
    $("cidadeFranqueado");

  const ufFranqueado =
    $("uf_cidadeFranqueado");


  // Nome
  if (!nome.value.trim()) {

    alert("Informe seu nome.");

    nome.focus();

    return false;
  }


  // WhatsApp
  if (!whatsapp.value.trim()) {

    alert("Informe seu WhatsApp.");

    whatsapp.focus();

    return false;
  }


  // E-mail
  if (!email.value.trim()) {

    alert("Informe seu e-mail.");

    email.focus();

    return false;
  }


  // Validação do e-mail
  const emailValido =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailValido.test(email.value.trim())) {

    alert("Informe um e-mail válido.");

    email.focus();

    return false;
  }


  // UF
  if (!uf.value) {

    alert("Selecione sua UF.");

    uf.focus();

    return false;
  }


  // Cidade
  if (!cidade.value) {

    alert("Selecione sua cidade.");

    cidade.focus();

    return false;
  }


  // Nome do franqueado
  if (!nomeFranqueado.value.trim()) {

    alert("Informe o nome do franqueado.");

    nomeFranqueado.focus();

    return false;
  }


  // UF do franqueado
  if (!ufFranqueado.value) {

    alert("Selecione a UF do franqueado.");

    ufFranqueado.focus();

    return false;
  }


  // Cidade do franqueado
  if (!cidadeFranqueado.value) {

    alert("Selecione a cidade do franqueado.");

    cidadeFranqueado.focus();

    return false;
  }


  return true;

}


// ============================================================
// CONVERTER PARA FIRESTORE
// ============================================================

function converterParaFirestore(data) {

  const fields = {};

  Object.entries(data).forEach(
    ([key, value]) => {

      fields[key] = {
        stringValue: String(value ?? "")
      };

    }
  );

  return {
    fields
  };

}


// ============================================================
// SALVAR LEAD
// ============================================================

async function salvarLead(data) {

  const url =
    `${FIRESTORE_URL}/leads_eda?key=${FIREBASE_CONFIG.apiKey}`;

  const lead = {
    ...data,

    perfil: "eda",

    dataCadastro:
      new Date().toISOString()
  };

  const documento =
    converterParaFirestore(lead);

  const response = await fetch(url, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify(documento)

  });

  fetch("https://default05f387c9461b475d9655fec969d0c0.17.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/20/workflows/b53a819590124d74ad161a1324ff3a92/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=F69lhB3b5EXExoB5aIr82Fbkn557CMCV7t78cdwzURY", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(lead)
  })
    .then(r => {
      console.log("Status:", r.status);
      return r.text();
    })
    .then(console.log)
    .catch(console.error);
  if (!response.ok) {

    const erro =
      await response.text();

    console.error(erro);

    throw new Error(
      "Erro ao salvar lead"
    );

  }


  return await response.json();

}


// ============================================================
// BOTÃO ENVIAR
// ============================================================

nextBtn.addEventListener(
  "click",
  async () => {

    // Validação
    if (!validateForm()) {
      return;
    }
    function formatarDataCadastro() {
      const agora = new Date();

      const dia = String(agora.getDate()).padStart(2, "0");
      const mes = String(agora.getMonth() + 1).padStart(2, "0");
      const ano = agora.getFullYear();

      const hora = String(agora.getHours()).padStart(2, "0");
      const minuto = String(agora.getMinutes()).padStart(2, "0");
      const segundo = String(agora.getSeconds()).padStart(2, "0");

      return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
    }

    // Monta os dados
    const data = {

      perfil: "eda",

      nomeCompleto:
        $("nomeCompleto").value.trim(),

      whatsapp:
        $("whatsapp").value.trim(),

      email:
        $("email").value.trim(),

      cidade:
        $("cidade").value,

      uf:
        $("uf_cidade").value,

      nomeFranqueado:
        $("nomeFranqueado").value.trim(),

      cidadeFranqueado:
        $("cidadeFranqueado").value,

      ufFranqueado:
        $("uf_cidadeFranqueado").value,

      dataCadastroLocal: formatarDataCadastro()
    };


    try {

      nextBtn.disabled = true;

      nextBtn.innerHTML =
        "Enviando...";


      await salvarLead(data);

      // Remove o formulário e exibe a mensagem de agradecimento
      const form = $("qualificationForm");
      form.style.display = "none";

      const success = document.createElement("section");
      success.className = "success-message";

      success.innerHTML = `
        <div class="success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
            <path d="M7.5 12.2L10.4 15.1L16.5 8.9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <span class="success-eyebrow">
          CADASTRO ENVIADO
        </span>

        <h2>Obrigado pelo seu interesse!</h2>

        <p>
          Recebemos seus dados com sucesso.
          Nossa equipe entrará em contato para apresentar todos os detalhes da oportunidade.
        </p>
      `;

      form.parentNode.insertBefore(success, form.nextSibling);


    } catch (error) {

      console.error(error);

      alert(
        "Erro ao enviar cadastro."
      );


    } finally {

      nextBtn.disabled = false;

      nextBtn.innerHTML =
        "Enviar perfil ✓";

    }

  }
);


// ============================================================
// INICIALIZAÇÃO
// ============================================================

renderForm();