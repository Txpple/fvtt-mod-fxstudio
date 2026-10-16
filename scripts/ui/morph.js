// A render that keeps what the person was doing. The screens are strings of HTML (no template
// engine, the house rule), and replacing a part of the window with innerHTML throws away focus, the
// caret, every scroll position and a half-typed number. So a part is not replaced: the new HTML is
// laid over the old nodes, which stay where they are. A node changes only where the new HTML says
// something different — an attribute, a text, a node of another kind — and a box the person is
// typing in keeps its value. No Foundry here; it works in whichever document the window lives in,
// a popped-out one included.

/** two nodes stand for the same thing when they are the same kind of node (an input of the same type) */
function same(a, b) {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) return false;
  if (a.nodeType !== 1) return true;
  if (a.nodeName === 'INPUT' && (a.getAttribute('type') ?? 'text') !== (b.getAttribute('type') ?? 'text')) return false;
  // a part that names what it holds is the same part only when it holds the same thing
  return (a.getAttribute('data-part') ?? '') === (b.getAttribute('data-part') ?? '');
}

function attrs(from, to) {
  for (const { name } of [...from.attributes]) if (!to.hasAttribute(name)) from.removeAttribute(name);
  for (const { name, value } of [...to.attributes]) if (from.getAttribute(name) !== value) from.setAttribute(name, value);
}

/** the live state of a control follows the new HTML, except in the box that has the focus */
function control(from, to) {
  const active = from.ownerDocument.activeElement === from;
  if (from.nodeName === 'INPUT') {
    const type = (from.getAttribute('type') ?? 'text').toLowerCase();
    if (type === 'checkbox' || type === 'radio') { from.checked = to.hasAttribute('checked'); return; }
    const value = to.getAttribute('value') ?? '';
    if (!active && from.value !== value) from.value = value;
    return;
  }
  if (from.nodeName === 'SELECT') {
    const pick = to.querySelector('option[selected]') ?? to.querySelector('option');
    const value = pick ? (pick.getAttribute('value') ?? pick.textContent) : '';
    if (from.value !== value) from.value = value;
  }
}

function node(from, to) {
  if (from.nodeType !== 1) { if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue; return; }
  attrs(from, to);
  children(from, to);
  control(from, to);
}

function children(from, to) {
  const was = [...from.childNodes];
  const now = [...to.childNodes];
  now.forEach((b, i) => {
    const a = was[i];
    if (!a) from.appendChild(b);
    else if (same(a, b)) node(a, b);
    else from.replaceChild(b, a);
  });
  for (let i = now.length; i < was.length; i++) was[i].remove();
}

/** lay `html` over the children of `el`: the nodes that stay the same stay, with their focus, caret and scroll */
export function morph(el, html) {
  if (!el) return;
  const t = el.ownerDocument.createElement('template');
  t.innerHTML = html;
  children(el, t.content);
}
