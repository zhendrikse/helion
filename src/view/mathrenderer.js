import katex from "katex";
import "katex/dist/katex.min.css";

export function renderMath(element, latex, {
    displayMode = true,
    throwOnError = false
} = {}) {

    if (window.Quarto) {
        element.textContent = displayMode
            ? `\\[${latex}\\]`
            : `\\(${latex}\\)`;

        if (window.MathJax) {
            window.MathJax.typesetPromise([element]);
        }

        return;
    }

    katex.render(latex, element, {
        displayMode,
        throwOnError,
        output: "html"
    });
}