import { Tools as $ } from '@kinkajou/tools/Tools';

const UUID = '' + (new Date()).getTime();

const COMPONENT_ATTR = '_c' + UUID;

const ATTR_OBSERVER_ATTR = '_attrObs' + UUID;

const EVENT_ATTR_PREFIX = 'on';

function ClassInstance_hasMethod(instance, methodName) {
	return $.isString(methodName)
		&& !!$.getAsFunction('constructor.prototype.hasOwnProperty', instance)
		&& instance.constructor.prototype.hasOwnProperty(methodName);
}

function _dedupArray(array) {
	const result = [];
	if ($.isArray(array)) {
		for (let i = 0; i < array.length; i++) {
			const item = array[i];
			if (item == null) {
				continue;
			} else if ($.isArray(item)) {
				for (let x = 0; x < item.length; x++) {
					const subItem = item[x];
					result.push(subItem);
				}
			} else {
				result.push(item);
			}
		}
	}
	return result;
}

function _createHTMLElement(ns, tag, attrs) {
	
	let element;
	if ($.isString(ns)) {
		element = document.createElementNS(ns, tag);
	} else {
		element = document.createElement(tag);
	}
	
	if (attrs) {
		for (const name in attrs) {
			if (attrs.hasOwnProperty(name)) {
				const value = attrs[name];
				if (value == null) {
					continue;
				}
				let handled = false;
				if ($.isPrimitive(value)) {
					if (!value && (name == 'id' || name == 'style' || name == 'class')) {
						continue;
					}
					if ($.isString(ns)) {
						element.setAttributeNS(null, name, '' + value);
					} else {
						element.setAttribute(name, '' + value);
					}
					handled = true;
				} else if (name.indexOf(EVENT_ATTR_PREFIX) == 0 && name.length > EVENT_ATTR_PREFIX.length && $.isFunction(value)) {
					const eventType = name.substr(EVENT_ATTR_PREFIX.length);
					element.addEventListener(eventType, value, false);
					handled = true;
				} else if (name == 'ref' && $.isFunction(value)) {
					value(element);
					handled = true;
				}
				if (!handled) {
					throw new Error('illegal attribute: ' + name + '. Element: ' + tag + '.');
				}
			}
		}
	}
	
	return element;
}

class VirtualNode {

	constructor(type, attrs, children) {

		Object.defineProperty(this, 'type', {
			value: type,
			enumerable: true,
		});

		this.attrs = $.toObject(attrs, {});
		this.children = _dedupArray(children);
	}

	static render(vnode, ns) {
		$.assertIsInstanceOf(vnode, VirtualNode, 'vnode', 'VirtualNode');
		return vnode.render(ns);
	}

	render(/** @type {String} */ ns) {

		if (ns != null) $.assertIsString(ns, 'ns');

		const type = this.type;
		const attrs = this.attrs;
		const children = this.children
		/** @type {Element} */ let element;
	
		if ($.isFunction(type)) {
			
			const component = Component.create(type, attrs, children);
	
			const ref = component.getAsFunction('ref');
			if (ref) {
				ref(component);
			}
			
			element = component.refresh();
			return element;
		}
		
		if ($.isString(type)) {
			element = _createHTMLElement(ns, type, attrs);
		} else {
			throw new Error('Illegal VirtualNode type');
		}
	
		for (let i = 0; i < children.length; i++) {
			
			const vchild = children[i];
			/** @type {Node} */ let node;
			
			if ($.isPrimitive(vchild)) {
				node = document.createTextNode('' + vchild);
			} else if (vchild instanceof VirtualNode) {
				node = vchild.render(ns);
			}
	
			if (!$.isInstanceOf(node, Node)) {
				throw new Error('illegal child');
			}
	
			element.appendChild(node);
			
			Component_handleAttachment(node);
		}
	
		return element;
	}
	
}

function Component_createProperties(component, attrs) {

	const props = {};

	if (attrs) {
		for (const name in attrs) {
			if (attrs.hasOwnProperty(name)) {
				Component_createProperty(component, props, attrs, name);
			}
		}
	}
	
	return props;
}

function Component_createProperty(component, props, attrs, name) {

	Object.defineProperty(props, name, {
		enumerable: true,
		get() {
			return attrs[name];
		},
		set(value) {
			const oldValue = attrs[name];
			if (component.beforePropChange(name, oldValue, value) !== false) {
				attrs[name] = value;
				component.onPropChange(name, value, oldValue);
			}
		}
	});
}

function Component_observeDetach(callback, node) {

	const observer = new MutationObserver((mutations, observer) => {
		mutations.forEach(m => {
			if (m.type === 'childList') {
				for (let i = 0; i < m.removedNodes.length; i++) {
					const removedNode = m.removedNodes[i];
					if (removedNode === node) {
						try {
							callback();
						} finally {
							try {
								const attrObserver = removedNode[ATTR_OBSERVER_ATTR];
								if (attrObserver) {
									attrObserver.disconnect();
								}
							} finally {
								observer.disconnect();
							}
						}
					}
				}
			}
		});
	});

	observer.observe(node.parentNode, {
		childList: true,
	});
}

function Component_observeAttrChange(callback, node) {

	const observer = new MutationObserver(mutations => {
		mutations.forEach(m => {
			if (m.type === 'attributes') {
				const name = m.attributeName;
				const value = node.getAttribute(name);
				const oldValue = m.oldValue;
				callback(name, value, oldValue);
			}
		});
	});

	observer.observe(node, {
		attributes: true,
		attributeOldValue: true,
	});

	node[ATTR_OBSERVER_ATTR] = observer;
}

function Component_handleAttachment(node) {

	$.assertIsInstanceOf(node, Node, 'node', 'Node');

	const component = Component.from(node);
	if (component) {
		
		const onAttach = component.onAttach.bind(component);
		onAttach();

		if (node.parentNode && ClassInstance_hasMethod(component, 'onDomDetach')) {
			const callback = component.onDomDetach.bind(component);
			Component_observeDetach(callback, node);
		}

		if (ClassInstance_hasMethod(component, 'onDomAttrChange')) {
			const callback = component.onDomAttrChange.bind(component);
			Component_observeAttrChange(callback, node);
		}
	}
}

class Component {

	get is() {
		return $.getAsString('constructor.is', this);
	}

	get className() {
		return Component.getClassName(this.constructor);
	}

	get id() {
		return $.getAsString('props.id', this);
	}

	get styleClass() {
		return $.getAsString('props.styleClass', this)
			|| $.getAsArray('styleRoot', this)
				.concat($.getAsArray('styleProps', this))
				.concat($.getAsString('props.class', this).split(' '))
				.filter(c => Boolean(c))
				.join(' ');
	}

	get styleRoot() {
		return this.is.split('.');
	}

	get styleProps() {
		return [];
	}

	get style() {
		return $.getAsString('props.style', this);
	}

	get rendered() {
		return $.isInstanceOf(this.element, Element);
	}

	get attached() {
		return this.rendered && this.element.parentNode != null;
	}

	constructor(attrs) {

		this.initProps((attrs = attrs || {}), (attrs, ...props) => {
			$.toArray(props).forEach(p => attrs['' + p] = attrs['' + p]);
		});

		const status = {};
		
		Object.defineProperty(this, 'props', {
			value: Component_createProperties(this, attrs),
			enumerable: true,
		});

		Object.defineProperty(this, 'children', {
			get() {
				return $.getAsArray('children', status);
			},
			set(value) {
				$.set('children', value, status);
			},
			enumerable: true,
		});
		
		Object.defineProperty(this, 'element', {
			get() {
				return $.get('element', status);
			},
			set(value) {
				$.assertIsInstanceOf(value, Element, 'element', 'Element');
				$.set('element', value, status);
			},
			enumerable: true,
		});

		Object.defineProperty(this, '$', {
			value: $,
			enumerable: true,
		});
	}

	static getClassName(constructor) {
		const is = $.getAsString('is', constructor);
		if (!$.isString(is)) return undefined;
		const array = is.split('.');
		return array[array.length - 1];
	}

	static create(constructor, attrs, children) {
		$.assertIsFunction(constructor, 'constructor');
		if (attrs != null) $.assertIsObject(attrs, 'attrs');
		const component = Object.create(constructor.prototype);
		constructor.apply(component, [ attrs ]);
		component.children = children;
		return component;
	}

	static from(node) {
		if (node instanceof VirtualNode) {
			$.assert($.isFunction(node.type), 'node must be a Component');
			return Component.create(node.type, node.attrs, node.children);
		} else {
			$.assertIsInstanceOf(node, Node, 'node', 'Node');
			const x = $.get(COMPONENT_ATTR, node);
			return $.isInstanceOf(x, Component) ? x : null;
		}
	}

	get(path) {
		return $.get(path, this.props);
	}

	set(path, value) {
		$.set(path, value, this.props);
	}

	getAsObject(path, def) {
		return $.getAsObject(path, this.props, def);
	}

	getAsArray(path, def) {
		return $.getAsArray(path, this.props, def);
	}

	getAsFunction(path, def) {
		return $.getAsFunction(path, this.props, def);
	}

	getAsBoolean(path, def) {
		return $.getAsBoolean(path, this.props, def);
	}

	getAsString(path, def) {
		return $.getAsString(path, this.props, def);
	}

	getAsFloat(path, def, min, max) {
		return $.getAsFloat(path, this.props, def, min, max);
	}

	getAsInteger(path, def, min, max) {
		return $.getAsInteger(path, this.props, def, min, max);
	}

	getAsInstanceOf(path, type) {
		return $.getAsInstanceOf(path, this.props, type);
	}

	initProps(attrs) {}

	beforePropChange(key, currentValue, nextValue) {}

	onPropChange(key, value, oldValue) {}

	onAttach() {}

	onDetach() {}

	onDomAttrChange(attrName, attrValue, oldValue) {}

	onDomDetach() {}

	render() {
		throw new Error('Kinkajou.Component.render() must be implemented!');
	}

	refresh() {

		/** @type {Node} */ let parent;
		/** @type {Element} */ let oldElement;
		if (this.attached) {
			oldElement = this.element;
			parent = oldElement.parentNode;
		}
		
		let element = this.render();
		$.assert(
			element instanceof Element || element instanceof SVGElement || element instanceof VirtualNode,
			'Illegal Kinkajou.Component.render() return. Please, return an Element, an SVGElement or use JSX syntax.'
		);

		if (element instanceof VirtualNode) {
			element = VirtualNode.render(element, parent ? parent.namespaceURI : null);
		}

		element.setAttribute('data-kj-comp', '');
		
		this.element = element;
		element[COMPONENT_ATTR] = this;

		if (parent && oldElement) {
			parent.replaceChild(element, oldElement);
		}
		
		return element;
	}

	dispatchEvent(event) {
		$.assertIsInstanceOf(event, Event, 'event', 'Event');
		if (!this.rendered) {
			throw new Error('Kinkajou.Component is not rendered!');
		}
		this.element.dispatchEvent(event);
	}

	checkAttached() {
		if (!this.attached) {
			throw new Error(`${this.is || 'Component'} is not attached`);
		}
	}

	checkRendered() {
		if (!this.rendered) {
			throw new Error(`${this.is || 'Component'} is not rendered`);
		}
	}

	clone() {
		return Component.create(this.constructor.prototype, this.props);
	}

}

function createElement(tag, attrs, ...children) {
	return new VirtualNode(tag, attrs, children);
}

function clear(root) {
	
	$.assertIsInstanceOf(root, Element, 'root', 'Element');

	const compNodes = root.querySelectorAll('[data-kj-comp]');
	for (let i = 0; i < compNodes.length; i++) {
		const compNode = compNodes[i];
		const component = Component.from(compNode);
		if (component) {
			component.onDetach();
		}
	}

	root.innerHTML = '';
}

function render(child, root, shouldClear) {
	
	$.assert(child instanceof Node || child instanceof VirtualNode, 'Illegal child argument. It should be a Node or a JSX element.');
	$.assertIsInstanceOf(root, Element, 'root', 'Element');

	let node;
	if (node instanceof Node) {
		node = child;
	} else {
		node = VirtualNode.render(child, root.namespaceURI);
	}
	
	if (shouldClear !== false) clear(root);
	root.appendChild(node);
	
	Component_handleAttachment(node);
}

export const Kinkajou = {
	CREF: COMPONENT_ATTR,
	$,
	VirtualNode,
	Component,
	clear,
	createElement,
	render,
};

if (window.__DEV__ === true) {
	window.Kinkajou = Kinkajou;
}