# @kinkajou/kinkajou

In 2008 I was working on a web project with a server side rendering technology.
I didn't like Java Server Pages (it was a Java project), so I used XML pages,
with custom tags inside (X)HTML markup.

Every custom tag was a graphical component, capable of displaying itself on the browser as HTML.

![Alt Custom component tag](https://github.com/lino79/kinkajou-kinkajou/blob/dev/component.png)

Nowadays there are a lot of cool client-side libraries which do the same thing.
But I wanted a technology for pure standalone client applications, without any
server support...

...Kinkajou is a component-based web library which performs this task (it's based
on Javascript/JSX syntax and AMD modules support).

### Hello World

``` JSX
import { Kinkajou } from '@kinkajou/kinkajou/Kinkajou';

class App extends Kinkajou.Component {

  get message() {
    // Returns the JSX 'message' attribute's value
    return this.getAsString('message');
  }

  render() {
    return <div>{this.message}</div>;
  }

}

Kinkajou.render(<App message="Hello World!" />, document.querySelector('body'));
```
