# darkWalker
Start a thread,let javascript runs in backgroud!

`controller.js`:

```js

  var me = {
    firstName: 'Toby',
    lastName : 'Zhang',
    getName  : function() {
        return this.firstName + '.' + this.lastName;
    },
    sayHello: function() {
        retur this.getName() + 'say hello to you!';
    }
  }

  var worker = darkWalker({
      uri : 'darkWalker.js',
      data: me,
      preforms: ['sayHello'] // 'me.sayHello' well be executing in backgroud.
  });


```
