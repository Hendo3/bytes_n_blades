/**
 * BYTE & BLADES - UI MODAL SYSTEM
 * "Replacing standard alerts with high-tech overlays."
 */

const Modal = {
    returnFocusTarget: null,
    tr(key, fallback) {
        return typeof window !== "undefined" && window.I18n
            ? window.I18n.t(key, {}, fallback)
            : fallback;
    },
    // --- MENSAGEM SIMPLES (Substituto do alert) ---
    alert(title, message, callback) {
        this.create(title, message, [
            { label: this.tr("modal.acknowledge", "ACKNOWLEDGE"), class: "btn-primary", onClick: () => { this.close(); if(callback) callback(); } }
        ], () => { this.close(); if (callback) callback(); });
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
        ], () => { this.close(); if (onCancel) onCancel(); });
    },

    // --- NÚCLEO (Cria o HTML) ---
    create(title, message, buttons, onEscape = null) {
        // Remove modal anterior se existir
        const returnFocus = this.returnFocusTarget || document.activeElement;
        this.close(false);
        this.returnFocusTarget = returnFocus;

        // Overlay de Fundo
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.id = "custom-modal";

        // Caixa da Mensagem
        const box = document.createElement("div");
        box.className = "modal-box";
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-labelledby", "custom-modal-title");
        box.setAttribute("aria-describedby", "custom-modal-description");

        // Header
        const header = document.createElement("div");
        header.className = "modal-header";
        const heading = document.createElement("h3");
        heading.id = "custom-modal-title";
        heading.textContent = title;
        header.appendChild(heading);

        // Corpo
        const body = document.createElement("div");
        body.className = "modal-body";
        body.id = "custom-modal-description";
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
        const initialFocus = allBtns[allBtns.length - 1] || box;
        if (typeof window !== "undefined" && window.CyberDialogs) {
            window.CyberDialogs.activate(overlay, {
                dialog: box,
                initialFocus,
                returnFocus,
                onEscape,
            });
        } else {
            initialFocus.focus();
        }
    },

    close(restoreFocus = true) {
        const existing = document.getElementById("custom-modal");
        if (!existing) return false;
        if (typeof window !== "undefined" && window.CyberDialogs) {
            window.CyberDialogs.deactivate(existing, { restoreFocus });
        } else if (restoreFocus && this.returnFocusTarget?.isConnected) {
            this.returnFocusTarget.focus();
        }
        existing.remove();
        if (restoreFocus) this.returnFocusTarget = null;
        return true;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = Modal;
}
