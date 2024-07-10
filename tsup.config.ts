import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["./src/*"],
    format: "esm",
    dts: true,
    clean: true,
    bundle: false,
    plugins: [
        {
            name: "add-js",
            renderChunk(code) {
                return {
                    code: code.replace(/^(import .*?) from "(.*?)";$/gm, (m, g0, g1) => {
                        if (!g1.startsWith("./") || g1.endsWith(".json")) return `${g0} from "${g1}";`;

                        return `${g0} from "${g1}.js";`;
                    }),
                };
            },
        },
    ],
});
