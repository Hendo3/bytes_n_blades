/**
 * BYTE & BLADES - UI MODAL SYSTEM
 * "Replacing standard alerts with high-tech overlays."
 */

const Modal = {
    tr(key, fallback) {
        return typeof window !== "undefined" && window.I18n
            ? window.I18n.t(key, {}, fallback)
            : fallback;
    },
    // --- MENSAGEM SIMPLES (Substituto do alert) ---
    alert(title, message, callback) {
        this.create(title, message, [
            { label: this.tr("modal.acknowledge", "ACKNOWLEDGE"), class: "btn-primary", onClick: () => { this.close(); if(callback) callback(); } }
        ]);
    },

    // --- CONFIRMAÇÃO (Substituto do confirm) ---
    confirm(title, message, onConfirm, onCancel) {
        this.create(title, message, [
            { 
                label: this.tr("modal.cancel", "CANCEL"), 
                class: "btn-secondary", 
                onClick: () => { 
                    this.close(); 
                    if(onCancel) onCancel(); 
                } 
            },
            { 
                label: this.tr("modal.confirm", "CONFIRM"), 
                class: "btn-danger", 
                onClick: () => { 
                    this.close(); 
                    if(onConfirm) onConfirm(); 
                } 
            }
        ]);
    },

    // --- NÚCLEO (Cria o HTML) ---
    create(title, message, buttons) {
        // Remove modal anterior se existir
        this.close();

        // Overlay de Fundo
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.id = "custom-modal";

        // Caixa da Mensagem
        const box = document.createElement("div");
        box.className = "modal-box";

        // Header
        const header = document.createElement("div");
        header.className = "modal-header";
        header.innerHTML = `<h3>${title}</h3>`;

        // Corpo
        const body = document.createElement("div");
        body.className = "modal-body";
        // Aceita HTML na mensagem para quebras de linha
        body.innerHTML = `<p>${message.replace(/\n/g, "<br>")}</p>`;

        // Rodapé (Botões)
        const footer = document.createElement("div");
        footer.className = "modal-footer";

        buttons.forEach(btnConfig => {
            const btn = document.createElement("button");
            btn.className = btnConfig.class || "btn-primary";
            btn.textContent = btnConfig.label;
            btn.onclick = btnConfig.onClick;
            footer.appendChild(btn);
        });

        // Montagem
        box.appendChild(header);
        box.appendChild(body);
        box.appendChild(footer);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Foco no último botão (geralmente confirmar ou ok) para acessibilidade
        const allBtns = footer.querySelectorAll("button");
        if(allBtns.length > 0) allBtns[allBtns.length - 1].focus();
    },

    close() {
        const existing = document.getElementById("custom-modal");
        if (existing) existing.remove();
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = Modal;
}
