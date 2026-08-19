import katex from "katex";
import "katex/dist/katex.min.css";

export function renderMath(element, latex, {
    displayMode = true,
    throwOnError = false
} = {}) {
    katex.render(latex, element, {
        displayMode,
        throwOnError,
        output: "html"
    });
}
