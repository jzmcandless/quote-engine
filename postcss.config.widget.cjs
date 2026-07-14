module.exports = {
  plugins: {
    tailwindcss: { config: require("path").resolve(__dirname, "tailwind.config.widget.ts") },
    autoprefixer: {},
  },
};
