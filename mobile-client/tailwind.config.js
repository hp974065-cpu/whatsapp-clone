/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./App.{js,jsx,ts,tsx}",
        "./src/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                wa: {
                    green: "#00a884",
                    light: "#25d366",
                    dark: "#008069",
                    bg: "#111b21",
                    panel: "#202c33",
                    header: "#2a3942",
                    input: "#2a3942",
                    chat: "#0b141a",
                    sender: "#005c4b",
                    receiver: "#202c33",
                    text: "#e9edef",
                    muted: "#8696a0",
                    unread: "#00a884",
                    danger: "#ea4335",
                }
            }
        },
    },
    plugins: [],
}
