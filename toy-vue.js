export class ToyVue {
  constructor(config) {
    const { el, data, methods } = config
    this.template = document.querySelector(el)
    this.data = reactive(data)
    for (let name in methods) {
      this[name] = () => {
        methods[name].apply(this.data)
      }
    }

    this.traverse(this.template)
  }
  traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim().match(/^{{([\s\S]+)}}$/)) {
        let name = RegExp.$1.trim()
        effect(() => (node.textContent = this.data[name]))
      }
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      let attributes = node.attributes
      for (let attribute of attributes) {
        if (attribute.name === 'v-model') {
          const value = attribute.value
          effect(() => (node.value = this.data[value]))
          node.addEventListener(
            'input',
            (event) => (this.data[value] = node.value)
          )
        }
        if (attribute.name.match(/^v\-bind:([\s\S]+)$/)) {
          const attrname = RegExp.$1
          const value = attribute.value
          effect(() => node.setAttribute(attrname, this.data[value]))
        }
        if (attribute.name.match(/^v\-on:([\s\S]+)$/)) {
          const eventName = RegExp.$1.trim()
          const fnName = attribute.value
          node.addEventListener(eventName, this[fnName])
        }
      }
    }
    if (node.childNodes && node.childNodes.length) {
      for (let child of node.childNodes) this.traverse(child)
    }
  }
}

const effects = new Map()

let currentEffect = null

function effect(fn) {
  currentEffect = fn
  fn()
  currentEffect = null
}

function reactive(object) {
  const observer = new Proxy(object, {
    get(object, property) {
      if (currentEffect) {
        if (!effects.has(object)) {
          effects.set(object, new Map())
        }
        if (!effects.get(object).has(property)) {
          effects.get(object).set(property, new Array())
        }
        effects.get(object).get(property).push(currentEffect)
      }
      return object[property]
    },
    set(object, property, value) {
      object[property] = value

      if (effects.has(object) && effects.get(object).has(property)) {
        for (let effect of effects.get(object).get(property)) {
          effect()
        }
      }

      return true
    },
  })
  return observer
}

// let dummy

// const counter = reactive({ num: 0 })
// effect(() => (dummy = counter.num))

// let dummy2

// const counter = reactive({ num: 0 })
// effect(() => (dummy2 = counter.num))

// counter.num = 7

// const counter = reactive({ num: 0 })

// window.c = counter

// effect(() => console.log(counter.num))
