'use client';

import { TextNode, $createTextNode } from 'lexical';

export class VariableNode extends TextNode {
    static getType() {
        return 'variable';
    }

    static clone(node) {
        return new VariableNode(node.__number, node.__text, node.__key);
    }

    constructor(number, text, key) {
        const safeText = text || `{{${number}}}`;
        super(safeText, key);
        this.__number = number;
    }

    isToken() {
        return true;
    }

    getMode() {
        return 'token';
    }

    getNumber() {
        return this.__number;
    }

    canInsertTextBefore() {
        return false;
    }

    canInsertTextAfter() {
        return false;
    }

    spliceText() {
        return this;
    }

    createDOM(config) {
        const dom = super.createDOM(config);
        dom.textContent = `{{${this.__number}}}`;
        dom.className = 'variable-node';
        dom.setAttribute('data-number', String(this.__number));
        dom.style.display = 'inline-block';
        dom.style.backgroundColor = 'var(--new-main)';
        dom.style.color = 'var(--new-light)';
        dom.style.padding = '0 4px';
        dom.style.borderRadius = '4px';
        dom.style.fontWeight = '600';
        dom.style.fontSize = '0.9em';
        dom.style.cursor = 'default';
        return dom;
    }

    updateDOM(prevNode, dom, config) {
        const updated = super.updateDOM(prevNode, dom, config);
        dom.className = 'variable-node';
        dom.setAttribute('data-number', String(this.__number));
        return updated;
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'variable',
            number: this.__number,
        };
    }

    static importJSON(serializedNode) {
        const node = new VariableNode(serializedNode.number);
        node.setFormat(serializedNode.format);
        node.setStyle(serializedNode.style);
        return node;
    }

    isTextEntity() {
        return true;
    }

    getTextContent() {
        return `{{${this.__number}}}`;
    }
}

export function $createVariableNode(number) {
    return new VariableNode(number);
}

export function $isVariableNode(node) {
    return node instanceof VariableNode;
}

export function $createVariableAsText(number) {
    return $createTextNode(`{{${number}}}`);
}
