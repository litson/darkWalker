# darkWalker
Start a thread,let javascript runs in backgroud!

### `controller.js`:

```js

  var me = {
    firstName: 'Tobey',
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
      performs: ['sayHello'] // 'me.sayHello' well be executing in backgroud.
  });


```



```js

  var foo = {
    bar: 'Hi,',
    0: function(next){
      this.bar = this.bar + 'througn the function "0"\n';
      next();
    },
    1: function(next){
      this.bar = this.bar + 'througn the function "1"\n';
      next();
    },
    2: function(next){
      this.bar = this.bar + 'througn the function "2"\n';
      next();
    },
    3: function(){
      console.log(this.bar);
      // Remember, your scope is in thread!
      postMessage(this.bar);
    }
  }
  
  var worker = darkWalker({
      uri : 'darkWalker.js',
      data: foo,
      // if you does not provide the 'preforms' option,
      // the worker will also sequential executing functions which the data options provided.
      performs: ['2', '1', '0', '3'] // you can also specify the order!
  });
  
  // print :
  // Hi,througn the function "2"
  // througn the function "1"
  // througn the function "0"
  
```

### 线程中的依赖

```js
  
  // square.js
  function square(number){
    return number * number;
  }
  
  // controller.js
  var foo = {
    bar: 2,
    getSquare: function(){
      this.bar = square(this.bar);
    },
    printResult: function(){
      console.log(this.bar);
    }
  }
  
  var worker = darkWalker({
      uri : 'darkWalker.js',
      data: foo,
      deps: ['square.js']
  });

  // print:
  // 4

```

### Methods

```js

  var worker = darkWalker({
    uri : 'darkWalker.js',
    data: function(){
        postMessage('I am in worker!');
    },
    // An EventListener that is called when .... just like onmessage...
    message: function(data, event) {
      console.log(data);  // print : I am in worker!
      console.log(event); // print : An MessageEvent Object
    }
    // An EventListener that is called when .... actually it's onerror in abstract worker.
    error : function(errorEvent) {
      console.log(errorEvent);
    }
    
  });


```







