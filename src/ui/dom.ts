/** 迷你 DOM 助手（与 tgv-max 同款模式）。 */
export type Child = Node | string | null | undefined;

export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: Record<string, unknown> = {},
    children: Child | Child[] = [],
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = String(v);
        else if (k === 'text') node.textContent = String(v);
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v as EventListener);
        else node.setAttribute(k, String(v));
    }
    for (const c of Array.isArray(children) ? children : [children]) {
        if (c == null) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
}
