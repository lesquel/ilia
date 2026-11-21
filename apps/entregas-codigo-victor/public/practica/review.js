const historySteps = JSON.parse(document.querySelector('#history').textContent);
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
const position = document.querySelector('#position');
const change = document.querySelector('#change-type');
const beforeCode = document.querySelector('#before-code');
const currentCode = document.querySelector('#current-code');
let index = 0;

function changedRange(before, after) {
    let start = 0;
    let suffix = 0;
    const limit = Math.min(before.length, after.length);
    while (start < limit && before[start] === after[start]) start += 1;
    while (suffix < limit - start && before.at(-1 - suffix) === after.at(-1 - suffix)) suffix += 1;
    return { start, suffix };
}

function showCode(target, code, { start, suffix }) {
    const end = code.length - suffix;
    const highlight = document.createElement('mark');
    highlight.textContent = code.slice(start, end);
    target.replaceChildren(code.slice(0, start), highlight, code.slice(end));
}

function render() {
    const step = historySteps[index];
    const before = historySteps[index - 1]?.code ?? '';
    const range = changedRange(before, step.code);
    showCode(beforeCode, before, range);
    showCode(currentCode, step.code, range);
    position.textContent = `Paso ${index + 1} de ${historySteps.length}`;
    change.textContent = step.kind === 'paste' ? `Pegado de ${step.pasted_chars} caracteres` : 'Edición en el editor';
    previous.disabled = index === 0;
    next.disabled = index === historySteps.length - 1;
}

previous.addEventListener('click', () => { index -= 1; render(); });
next.addEventListener('click', () => { index += 1; render(); });
render();
