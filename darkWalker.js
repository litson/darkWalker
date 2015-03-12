/**
 *  Dark Walker
 *  Web Worker的模拟后台运行的工具类
 *
 *  第一版名字叫做backgroud，意在表示在后台运行，
 *  但是CSS写多了，这个名字总觉得很别扭。
 *
 *  改名为Dark walker，黑暗中的行者
 *  表示他所做的操作都在暗中进行，
 *  walker 和 worker 谐音，异曲同工之妙
 *
 */
;
(function __dark_walker_package__() {

    // 检测是否是在worker线程内运行
    var isInWorker = !!self.WorkerLocation;

    // 如果是在worker中运行，启动onmessage捕获
    if (isInWorker) {
        eventCatcher();

        // 否则向window作用域抛出 worker的包装函数
    } else {
        window.darkWalker = darkWalker;
    }


    /**
     * [创建worker的包装集]
     * 每次调用共享同一个worker单例，
     * 调用时，如果存在worker实例，会立即终止该线程
     * @param  {[Object]} options [配置文件]
     *
     *      deps:[], // 需要通过 importScripts 引入的脚本文件，会再第一时间加载
     *      uri:'',  // worker文件的地址，也就是本文件的地址
     *      data:{}, // 需要交给worker处理的数据，里面可保护对改数据的处理函数
     *
     *      performs:[],
     *                   // 数据（data）传输完毕后，需要执行的data中的处理函数的句柄
     *                   // 可选 ，如不提供，默认为数据（data）中的所提供的函数。
     *                   // 函数会按照给出的句柄顺序执行，并提供一个'next'函数句柄当作参数
     *                   // 开发者可使用'next'来决定何时执行下一个函数
     *
     *
     * @return {[Object]}         [将当前worker实例返回]
     */
    function darkWalker(options) {
        if (!darkWalker.worker) {
            darkWalker.worker = new Worker(options.uri);
        } else {
            darkWalker.worker.terminate();
        }

        var worker = darkWalker.worker;
        var data = serializeData(options.data);
        worker.postMessage({
            deps: options.deps || [],
            performs: options.performs || [],
            data: data
        });
        return worker;
    };

    /**
     * [序列化数据]
     * 因为传输的data中如果有函数表达式，
     * worker会报错；
     * 如果使用JSON.stringify直接序列化
     * 函数表达式则会丢失
     * @param  {[Object]} data [需要序列化的数据]
     * @return {[String]}      [序列化后的数据]
     */
    function serializeData(data) {
        var key;
        var temp;
        var result = {};

        for (key in data) {
            temp = data[key];
            result[key] = (typeof temp === 'function') ? temp.toLocaleString() : temp;
        }

        return JSON.stringify(result);
    };

    /**
     * [启动onmessge捕获]
     */
    function eventCatcher() {
        return onmessage = function(event) {
            var options = event.data;
            var data = deserialize(options.data);
            var fns = [];
            // console.log(data);
            // 
            if (options.deps.length) {
                options.deps.forEach(function(uri) {
                    importScripts(uri);
                });
            };

            //
            if (!options.performs.length) {
                options.performs = Object.keys(data).filter(function(key) {
                    var temp = data[key];
                    if (typeof temp === 'function') {
                        return key;
                    }
                });
            }

            options.performs.forEach(function(key) {
                var temp = data[key];
                temp && fns.push(temp);
            });

            // 
            queue(fns);
        }
    };

    /**
     * [对已经序列化的数据解码]
     * 主要对函数进行解码操作，绑定正确的作用域。
     * @param  {[String]} dataString [序列化的字符串]
     * @return {[Object]}            [解码后的对象字面量]
     */
    function deserialize(dataString) {
        var data = JSON.parse(dataString);
        // 保证枚举时键值对是有序的
        var keys = Object.keys(data);
        var temp;
        keys.forEach(function(key) {
            var temp = data[key].toString();
            if (0 === temp.indexOf('function')) {
                data[key] = (function(fnBody, context) {

                    return function() {

                        return eval('(' + fnBody + ')').apply(this, Array.prototype.slice.call(arguments));

                    }.bind(context);

                }(temp, data));
            }
        });
        return data;
    };

    /**
     * [队列函数]
     * @param  {[Array]} fns     [函数队列]
     * @param  {[Object]} context [函数的执行上下文]
     */
    function queue(fns, context) {
        (function next() {
            if (fns.length > 0) {
                var fn = fns.shift();
                fn.apply(context, [next].concat(Array.prototype.slice.call(arguments, 0)));
            }
        })();
    };
})();



