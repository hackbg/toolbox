import { defineCallable } from '.'

class Foo {
  x = 1
}

const foo = new Foo()

class CallableFoo extends defineCallable(function () {
  return this.x
}, Foo) {
  y = 2
}

const callableFoo = new CallableFoo()

class Bar extends CallableFoo {
  a = 1
}

const bar = new Bar()

class CallableBar extends defineCallable(function () {
  return this.x
}, Bar) {
  b = 2
}

const callableBar = new CallableBar()
