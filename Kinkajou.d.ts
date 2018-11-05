import { Tools } from '@kinkajou/tools/Tools';

export namespace Kinkajou {

	/**
	 * Component reference inside a genereted Element.
	 */
	export const CREF: string;

	/**
	 * A reference to the Tools library.
	 */
	export const $: typeof Tools;

	/**
	 * A virtual node genereted by Kinkajou.createElement.
	 */
	export class VirtualNode {
		
		/**
		 * Node name or component's class.
		 */
		readonly type: string | Function;
		
		/**
		 * Node attributes.
		 */
		readonly attrs: Object;
		
		/**
		 * Node content.
		 */
		readonly children: Array<String | VirtualNode>;

		/**
		 * Constructor.
		 * 
		 * @param type node name or component's class.
		 * @param attrs node attributes.
		 * @param children node content.
		 */
		constructor(type: string | Function, attrs: Object, ...children: Array<String | VirtualNode>);

		/**
		 * Renders a `VirtualNode` as an `Element`.
		 * 
		 * @param vnode a `VirtualNode`
		 * @param ns Optional namespace.
		 */
		static render(vnode: VirtualNode, ns?: string): Element;
	
		/**
		 * Renders this `VirtualNode` as an `Element`.
		 * 
		 * @param ns Optional namespace.
		 */
		render(ns?: string): Element;
		
	}

	/**
	 * Base component.
	 */
	export abstract class Component {

		/**
		 * Component's qualified class name.
		 */
		readonly is: string;

		/**
		 * Class name.
		 */
		readonly className: string;

		/**
		 * ID attribute.
		 */
		readonly id: string;

		/**
		 * Style class.
		 */
		readonly styleClass: string;

		/**
		 * Main style class.
		 */
		readonly styleRoot: Array<string>;

		/**
		 * Style class sub-properties.
		 */
		readonly styleProps: Array<string>;

		/**
		 * Style attribute.
		 */
		readonly style: string;

		/**
		 * Was this component rendered as an HTML element?
		 */
		readonly rendered: boolean;

		/**
		 * Is this component attached to DOM?
		 */
		readonly attached: boolean;

		/**
		 * The component's properties.
		 */
		readonly props: Object;

		/**
		 * The component's children.
		 */
		readonly children: Array<string | VirtualNode>;
		
		/**
		 * The rendered Element.
		 */
		readonly element: Element;

		/**
		 * Tools.
		 */
		readonly $: typeof Tools;

		/**
		 * Constructor.
		 * 
		 * @param attrs JSX attributes.
		 */
		constructor(attrs: Object);

		/**
		 * Returns the component's qualified class name (from static is getter).
		 * 
		 * @param type Component's class.
		 */
		static getClassName<T extends Component>(type: T): string;

		/**
		 * Creates a new component.
		 * 
		 * @param type component's class.
		 * @param attrs component's attributes.
		 * @param children component's children.
		 */
		static create<T extends Component>(type: T, attrs: Object, ...children: Array<string | VirtualNode>): T;

		/**
		 * Returns the Component binded to the node.
		 * 
		 * @param node HTML node.
		 */
		static from<T extends Component>(node: Node | VirtualNode): T;

		/**
		 * Returns a new (nested) property.
		 * 
		 * @param path the nested path.
		 */
		get<T>(path: string | Array<string>): T;

		/**
		 * Sets a new (nested) property.
		 * 
		 * @param path the nested path.
		 * @param value the value to set.
		 */
		set<T>(path: string | Array<string>, value: T): T;

		/**
		 * Returns a new (nested) property as a Object.
		 * 
		 * @param path the nested property path.
		 * @param def Optional default value (or `null`).
		 */
		getAsObject(path: string | Array<string>, def?: Object): Object;

		/**
		 * Returns a new (nested) property as an Array.
		 * 
		 * @param path the nested property path.
		 * @param def Optional default value (or `[]`).
		 */
		getAsArray(path: string | Array<string>, def?: Array<any>): Array<any>;

		/**
		 * Returns a new (nested) property as a function.
		 * 
		 * @param path the nested property path.
		 * @param def Optional default value (or `undefined`).
		 */
		getAsFunction(path: string | Array<string>, def?: Function): Function;

		/**
		 * Returns a new (nested) property as a boolean.
		 * 
		 * @param path the nested property path.
		 * @param def Optional default value (or `false`).
		 */
		getAsBoolean(path: string | Array<string>, def?: boolean): boolean;

		/**
		 * Returns a new (nested) property as a string.
		 * 
		 * @param path the nested property path.
		 * @param def Optional default value (or `''`).
		 */
		getAsString(path: string | Array<string>, def?: string): string;

		/**
		 * Returns a new (nested) property as a number.
		 * 
		 * @param path the nested property path.
		 * @param def Optional default value (or `0`).
		 * @param min minimum value.
		 * @param max maximum value.
		 */
		getAsFloat(path: string | Array<string>, def?: number, min?: number, max?: number): number;

		/**
		 * Returns a new (nested) property as a number.
		 * 
		 * @param path the nested property path.
		 * @param def Optional default value (or `0`).
		 * @param min minimum value.
		 * @param max maximum value.
		 */
		getAsInteger(path: string | Array<string>, def?: number, min?: number, max?: number): number;

		/**
		 * Returns a new (nested) property as an instance of `type` or `null`.
		 * 
		 * @param path the nested property path.
		 * @param type expected type.
		 */
		getAsInstanceOf<T>(path: string | Array<string>, type: T): T;

		/**
		 * Properties initialization from DOM attributes.
		 * 
		 * @param attrs declarative node attributes.
		 */
		initProps(attrs, initializer: (attrs, ...props: Array<string>) => any): void;

		/**
		 * Property change callback. A `false` return will prevent
		 * the attribute change.
		 * 
		 * @param {String} key property name.
		 * @param {*} currentValue property current value.
		 * @param {*} nextValue property next value.
		 */
		beforePropChange(key, currentValue, nextValue): boolean;

		/**
		 * Property change callback.
		 * 
		 * @param {String} key property name.
		 * @param {*} currentValue property current value.
		 * @param {*} nextValue property next value.
		 */
		onPropChange(key, value, oldValue): void;

		/**
		 * DOM attachment callback.
		 * This method is called after this component has been
		 * attached to the DOM.
		 */
		onAttach(): void;

		/**
		 * DOM detachment callback.
		 * Triggered by Kinkajou.clear() or Kinkajou.render().
		 */
		onDetach(): void;

		/**
		 * DOM attributes change native callback (uses MutationObserver).
		 */
		onDomAttrChange(attrName, attrValue, oldValue): void;

		/**
		 * DOM detachment native callback (uses MutationObserver).
		 */
		onDomDetach(): void;

		/**
		 * Renders itself as an HTML element.
		 * 
		 * @return an HTML element.
		 */
		abstract render(): Element | SVGElement | VirtualNode;

		/**
		 * Refreshes itself in the DOM.
		 * 
		 * @return an HTML element.
		 */
		refresh(): Element;

		/**
		 * Dispatches an Event.
		 * 
		 * @param event event to be dispatched.
		 */
		dispatchEvent(event: Event): void;

		/**
		 * Throws an error if this component is not attached.
		 */
		checkAttached(): void;

		/**
		 * Throws an error if this component is not rendered.
		 */
		checkRendered(): void;

		/**
		 * Clones this component.
		 */
		clone(): Component;

	}

	/**
	 * Creates a virtual DOM node from JSX syntax.
	 * 
	 * @param tag HTML node name or JSX component class.
	 * @param attrs element attributes.
	 * @param children element content.
	 */
	export function createElement(tag: string | Function, attrs: Object, ...children: Array<string | VirtualNode>): VirtualNode;

	/**
	 * Clears the node content.
	 * 
	 * @param root a node.
	 */
	export function clear(root: Element): void;

	/**
	 * Renders a VirtualNode into the root element or attach the element inside it
	 * (first resets the root contents).
	 * 
	 * @param element element to be rendered/attached.
	 * @param root root element.
	 * @param clear (Optional) If `true`, clear the root content. Default is `true`.
	 */
	export function render(element: Element | VirtualNode, root: Element, clear?: boolean): void;

}