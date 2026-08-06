/**
 * BYTE & BLADES - BREACH PROTOCOL
 * "High risk, high reward."
 */

const HackSystem = {
    isRunning: false,
    cursorPos: 0,
    direction: 1,
    speed: Math.random() * 10 + 5, // Velocidade inicial
    targetStart: 0,
    targetWidth: 0,
    animationFrame: null,
    
    // Callback para quando terminar (sucesso ou falha)
    onComplete: null,

    init(onCompleteCallback) {
        this.onComplete = onCompleteCallback;
        this.createUI();
        this.startRound();
    },

    createUI() {
        const tr = (key, fallback) => typeof window !== "undefined" && window.I18n
            ? window.I18n.t(key, {}, fallback)
            : fallback;
        const overlay = document.createElement("div");
        overlay.className = "hack-overlay"
        overlay.id = "hack-overlay";

        overlay.innerHTML = `
            <div class="hack-terminal">
                <h2>>> ${tr("hack.title", "BREACH PROTOCOL")} <<</h2>
                <div class="hack-status" id="hack-msg">${tr("hack.injecting", "INJECTING MALWARE... STOP IN THE BLUE ZONE")}</div>
                
                <div class="hack-screen" id="hack-screen">
                    <div class="hack-target-zone" id="hack-target"></div>
                    <div class="hack-cursor" id="hack-cursor"></div>
                </div>

                <button class="btn-hack-action" id="btn-hack-stop">${tr("hack.execute", "EXECUTE")}</button>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById("btn-hack-stop").onclick = () => this.stop();
    },

    startRound() {
        this.isRunning = true;
        this.cursorPos = 0;
        this.direction = 1;
        // Velocidade aleatória para dificultar
        this.speed = 8 + Math.random() * 10; // Entre 8 e 18

        // Define zona de sucesso aleatória (entre 20% e 80% da tela)
        const screenWidth = document.getElementById("hack-screen").offsetWidth;
        this.targetWidth = 20 + Math.random() * 60; // Largura entre 20px e 80px
        this.targetStart = Math.random() * (screenWidth - this.targetWidth);

        // Aplica CSS
        const targetEl = document.getElementById("hack-target");
        targetEl.style.left = this.targetStart + "px";
        targetEl.style.width = this.targetWidth + "px";

        this.loop();
    },

    loop() {
        if (!this.isRunning) return;

        const screen = document.getElementById("hack-screen");
        if (!screen) return;
        const width = screen.offsetWidth;
        const cursor = document.getElementById("hack-cursor");

        // Movimento
        this.cursorPos += this.speed * this.direction;

        // Bater nas paredes
        if (this.cursorPos >= width || this.cursorPos <= 0) {
            this.direction *= -1;
        }

        cursor.style.left = this.cursorPos + "px";

        this.animationFrame = requestAnimationFrame(() => this.loop());
    },

    stop() {
        this.isRunning = false;
        cancelAnimationFrame(this.animationFrame);

        // Checar colisão
        const hit = this.cursorPos >= this.targetStart && this.cursorPos <= (this.targetStart + this.targetWidth);
        
        const msg = document.getElementById("hack-msg");
        const btn = document.getElementById("btn-hack-stop");

        if (hit) {
            msg.textContent = typeof window !== "undefined" && window.I18n
                ? window.I18n.t("hack.granted", {}, "ACCESS GRANTED. FUNDS DIVERTED.")
                : "ACCESS GRANTED. FUNDS DIVERTED.";
            msg.style.color = "var(--neon-green)";
            btn.style.background = "var(--neon-green)";
            setTimeout(() => this.close(true), 1000);
        } else {
            msg.textContent = typeof window !== "undefined" && window.I18n
                ? window.I18n.t("hack.detected", {}, "BREACH DETECTED. TRACE INITIATED.")
                : "BREACH DETECTED. TRACE INITIATED.";
            msg.style.color = "var(--alert-color)";
            setTimeout(() => this.close(false), 1000);
        }
    },

    close(success) {
        document.getElementById("hack-overlay").remove();
        if (this.onComplete) this.onComplete(success);
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = HackSystem;
}
