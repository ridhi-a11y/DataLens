/**
 * Test script to verify the table extraction algorithms against real-world HTML table scenarios
 */
import assert from 'node:assert';
import { parseTableElement } from '../src/extraction/tableExtractor.ts';

// Minimal DOM simulation for Node testing
class MockElement {
  tagName: string;
  attributes: Record<string, string>;
  textContent: string;
  children: MockElement[];
  parentElement: MockElement | null;
  offsetParent: object | null;

  constructor(tagName: string, attributes: Record<string, string> = {}, textContent: string = '') {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attributes };
    this.textContent = textContent;
    this.children = [];
    this.parentElement = null;
    this.offsetParent = {};
  }

  getAttribute(name: string) {
    return this.attributes[name] || null;
  }

  setAttribute(name: string, val: string) {
    this.attributes[name] = String(val);
  }

  removeAttribute(name: string) {
    delete this.attributes[name];
  }

  appendChild(child: MockElement) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  querySelector(selector: string): MockElement | null {
    const list = this.querySelectorAll(selector);
    return list.length > 0 ? list[0] : null;
  }

  querySelectorAll(selector: string): MockElement[] {
    const matches: MockElement[] = [];
    const sel = selector.toLowerCase().trim();

    const traverse = (node: MockElement) => {
      for (const child of node.children) {
        const tag = child.tagName.toLowerCase();
        if (sel === tag) {
          matches.push(child);
        } else if (sel === 'th, td' && (tag === 'th' || tag === 'td')) {
          matches.push(child);
        }
        traverse(child);
      }
    };
    traverse(this);
    return matches;
  }

  contains(node: MockElement): boolean {
    let curr: MockElement | null = node;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentElement;
    }
    return false;
  }

  closest(tag: string): MockElement | null {
    const upper = tag.toUpperCase();
    let curr: MockElement | null = this;
    while (curr) {
      if (curr.tagName === upper) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  getBoundingClientRect() {
    return { width: 300, height: 200 };
  }
}

// Global setup for Node environment
(globalThis as unknown as { window: unknown }).window = {
  getComputedStyle: () => ({ display: 'table', visibility: 'visible' }),
  location: { href: 'https://example.com/data' },
};
(globalThis as unknown as { document: unknown }).document = {
  title: 'Sample Data Page',
  getElementById: () => null,
  querySelectorAll: () => [],
};

console.log('Testing parseTableElement with sample tables...');

// Table 1: Standard Table with Caption, thead, tbody
const table1 = new MockElement('table');
table1.appendChild(new MockElement('caption', {}, 'Q4 Revenue Report'));

const thead1 = new MockElement('thead');
const trHead1 = new MockElement('tr');
trHead1.appendChild(new MockElement('th', {}, 'Department'));
trHead1.appendChild(new MockElement('th', {}, 'Budget'));
trHead1.appendChild(new MockElement('th', {}, 'Spend'));
thead1.appendChild(trHead1);
table1.appendChild(thead1);

const tbody1 = new MockElement('tbody');
const tr1 = new MockElement('tr');
tr1.appendChild(new MockElement('td', {}, 'Engineering'));
tr1.appendChild(new MockElement('td', {}, '$100,000'));
tr1.appendChild(new MockElement('td', {}, '$92,000'));
tbody1.appendChild(tr1);

const tr2 = new MockElement('tr');
tr2.appendChild(new MockElement('td', {}, 'Marketing'));
tr2.appendChild(new MockElement('td', {}, '$80,000'));
tr2.appendChild(new MockElement('td', {}, '$74,000'));
tbody1.appendChild(tr2);
table1.appendChild(tbody1);

const parsed1 = parseTableElement(table1 as unknown as HTMLTableElement, 0);

assert.ok(parsed1, 'Should parse valid table');
assert.strictEqual(parsed1.name, 'Q4 Revenue Report', 'Table name should come from caption');
assert.deepStrictEqual(parsed1.headers, ['Department', 'Budget', 'Spend']);
assert.strictEqual(parsed1.totalRows, 2);
assert.strictEqual(parsed1.totalColumns, 3);
assert.strictEqual(parsed1.rows[0][0], 'Engineering');
assert.strictEqual(parsed1.rows[1][2], '$74,000');
console.log('✔ Test 1: Standard table parsing passed');

// Table 2: Headerless table
const table2 = new MockElement('table');
const trA = new MockElement('tr');
trA.appendChild(new MockElement('td', {}, 'Item'));
trA.appendChild(new MockElement('td', {}, 'Value'));
table2.appendChild(trA);

const trB = new MockElement('tr');
trB.appendChild(new MockElement('td', {}, 'Alpha'));
trB.appendChild(new MockElement('td', {}, '100'));
table2.appendChild(trB);

const parsed2 = parseTableElement(table2 as unknown as HTMLTableElement, 1);
assert.ok(parsed2, 'Should parse headerless table');
assert.strictEqual(parsed2.totalColumns, 2);
assert.strictEqual(parsed2.totalRows, 1); // 1st row used as header
console.log('✔ Test 2: Headerless table parsing passed');

console.log('\nAll table extraction tests passed cleanly!');
