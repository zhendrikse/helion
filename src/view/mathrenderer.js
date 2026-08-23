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

        if (window.MathJax)
            window.MathJax.typesetPromise([element]);

        return;
    }

    katex.render(latex, element, {
        displayMode,
        throwOnError,
        output: "html"
    });
}

export function renderMathInHtml(element, html, {
    displayMode = false,
    throwOnError = false
} = {}) {

    element.innerHTML = html;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

    const textNodes = [];
    while (walker.nextNode())
        textNodes.push(walker.currentNode);

    for (const textNode of textNodes) {
        const text = textNode.nodeValue;
        if (!text.includes("$"))
            continue;

        const fragment = document.createDocumentFragment();
        let position = 0;
        const regex = /\$\$([\s\S]*?)\$\$|\$([^$]+?)\$/g;

        for (const match of text.matchAll(regex)) {
            const matchStart = match.index;

            // Ordinary text before the LaTeX
            if (matchStart > position)
                fragment.appendChild(document.createTextNode(text.substring(position, matchStart)));

            const latex = match[1] ?? match[2];
            const isDisplay = match[1] !== undefined;
            const mathSpan = document.createElement(isDisplay ? "div" : "span");
            katex.render(latex, mathSpan, {displayMode: isDisplay, throwOnError, output: "html"});
            fragment.appendChild(mathSpan);
            position = matchStart + match[0].length;
        }

        // Remainder of text
        if (position < text.length)
            fragment.appendChild(document.createTextNode(text.substring(position)));

        textNode.parentNode.replaceChild(fragment, textNode);
    }
}
