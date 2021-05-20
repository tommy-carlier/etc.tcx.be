(function(){
  "use strict";

  const d = document;

  function createDiv(className) {
    const div = d.createElement('div');
    div.className = className;
    return div;
  }

  function appendDiv(node, className) {
    return node.appendChild(createDiv(className));
  }

  function createNode(text) {
    const node = createDiv('Node collapsed');
    appendDiv(node, 'Expander');
    const content = appendDiv(node, 'Content');
    content.contentEditable = 'true';
    if(text) content.textContent = text;
    appendDiv(node, 'Children');
    return node;
  }

  function expanderElement(node) { return node.firstChild; }
  function contentElement(node) { return node.children[1]; }
  function childrenElement(node) { return node.lastChild; }
  function parentNode(node) { 
    node = node.parentElement;
    if(node && node.classList.contains('Children')) return node.parentElement;
    return null;
  }

  function isExpanded(node) { return node.classList.contains('expanded'); }
  function swapClass(node, oldClass, newClass) {
    node.classList.remove(oldClass);
    node.classList.add(newClass);
  }
  function expand(node) { swapClass(node, 'collapsed', 'expanded'); }
  function collapse(node) { swapClass(node, 'expanded', 'collapsed'); }
  function toggle(node) { (isExpanded(node)?collapse:expand)(node); }

  function focusContent(node) {
    if(node) contentElement(node).focus();
  }

  function lastVisibleLeaf(node) {
    while(node && isExpanded(node)) {
      var lastChild = childrenElement(node).lastChild;
      if(lastChild) node = lastChild;
    }
    return node;
  }

  function focusPrevContent(node) {
    var prev = node.previousSibling;
    if(prev) prev = lastVisibleLeaf(prev);
    else prev = parentNode(node);
    focusContent(prev);
  }

  function focusNextContent(node) {
    var next = isExpanded(node) ? childrenElement(node).firstChild : node.nextSibling;
    if(!next) {
      const parent = parentNode(node);
      if(parent) next = parent.nextSibling;
    }
    focusContent(next);
  }

  function appendSibling(node, sibling) {
    return node.insertAdjacentElement('afterEnd', sibling);
  }

  function prependSibling(node, sibling) {
    return node.insertAdjacentElement('beforeBegin', sibling);
  }

  function appendChild(node, child) {
    return childrenElement(node).appendChild(child);
  }

  function appendNewSiblingOrFirstChild(node) {
    if(isExpanded(node)) {
      const firstChild = childrenElement(node).firstChild;
      if(firstChild) {
        focusContent(prependSibling(firstChild, createNode()));
        return;
      }
    }
    focusContent(appendSibling(node, createNode()));
  }

  function indent(node) {
    const prev = node.previousSibling;
    if(prev) {
      expand(prev);
      appendChild(prev, node);
      focusContent(node);
    }
  }

  function outdent(node) {
    const parent = parentNode(node);
    if(parent) {
      appendSibling(parent, node);
      focusContent(node);
    }
  }

  function moveUp(node) {
    const prev = node.previousSibling || parentNode(node);
    if(prev) {
      prependSibling(prev, node);
      focusContent(node);
    }
  }

  function moveDown(node) {
    const next = node.nextSibling || parentNode(node);
    if(next) {
      appendSibling(next, node);
      focusContent(node);
    }
  }

  const outlinerElement = d.getElementById('outliner');
  focusContent(outlinerElement.appendChild(createNode('Test')));
  
  outlinerElement.addEventListener('click', e => {
    if(e.target.classList.contains('Expander')) {
      toggle(e.target.parentElement);
    }
  });

  const MOD_NONE = 0, MOD_CTRL = 1, MOD_ALT = 2, MOD_SHIFT = 4, MOD_META = 8;
  function getModKeys(e) {
    var mod = MOD_NONE;
    if(e.ctrlKey) mod += MOD_CTRL;
    if(e.altKey) mod += MOD_ALT;
    if(e.shiftKey) mod += MOD_SHIFT;
    if(e.metaKey) mod += MOD_META;
    return mod;
  }

  outlinerElement.addEventListener('keydown', e => {
    const node = e.target.parentElement;
    switch(e.key) {
      case 'Enter':
      if(getModKeys(e) == MOD_NONE) { appendNewSiblingOrFirstChild(node); e.preventDefault(); }
      break;

      case 'Tab':
      e.preventDefault();
      switch(getModKeys(e)) {
        case MOD_NONE: indent(node); break;
        case MOD_SHIFT: outdent(node); break;
      }
      break;

      case 'ArrowUp':
      switch(getModKeys(e)) {
        case MOD_ALT: moveUp(node); e.preventDefault(); break;
        case MOD_CTRL: focusPrevContent(node); e.preventDefault();break;
      }
      break;

      case 'ArrowDown':
      switch(getModKeys(e)) {
        case MOD_ALT: moveDown(node); e.preventDefault(); break;
        case MOD_CTRL: focusNextContent(node); e.preventDefault();break;
      }
      break;

      case 'ArrowLeft':
      if(getModKeys(e) == MOD_ALT) { outdent(node); e.preventDefault(); }
      break;

      case 'ArrowRight':
      if(getModKeys(e) == MOD_ALT) { indent(node); e.preventDefault(); }
      break;
    }
  });
}())