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

    var DEBUG = false;

    var SEPARATOR = '_i0705n_';

    // 检测是否是在worker线程内运行
    var isInWorker = !!self.WorkerLocation;

    // 如果是在worker中运行，启动onmessage捕获
    if (isInWorker) {
        log('\n[已进入worker线程]\n');
        eventCatcher();
        // 否则向window作用域抛出 worker的包装函数
    } else {
        window.darkWalker = darkWalker;
    }


    /**
     * [创建worker的包装集]
     *
     * 调用时，如果存在worker实例，会终止并重启一个新的线程。
     * @param  {[Object]} options [配置文件]
     *
     *      deps: [], // 需要通过 importScripts 引入的脚本文件，会再第一时间加载
     *      uri : '',  // worker文件的地址，也就是本文件的地址
     *      data: {} || function, // 需要交给worker处理的数据，里面可保护数据中的处理函数
     *                            // 也可以是个function，当为函数时，默认线程创建完毕立即执行
     *      performs: [], // 数据（data）传输完毕后，需要执行的data中的处理函数的句柄
     *                    // 可选
     *                    // 函数会按照给出的句柄顺序执行，并提供一个'next'函数句柄当作参数
     *                    // 开发者可使用'next'来决定何时执行下一个函数
     *      message: function(data, event) {...} // worker的onmessage
     *      error  : function(errorEvent) {...}  // worker的onerror
     *
     *
     * @return {[Object]}         [将当前worker实例返回]
     */
    function darkWalker(options) {

        if (!darkWalker.worker) {
            darkWalker.worker = new Worker(options.uri);
        } else {
            darkWalker.worker.terminate();
            darkWalker.worker = null;
            return darkWalker(options);
        }

        log('group', '\n[================== 调试信息 ==================]\n');

        var worker = darkWalker.worker;
        var data = serializeData(options.data);

        worker.postMessage({
            deps: options.deps || [],
            performs: options.performs || [],
            data: data,
            observe: options.observe || []
        });

        worker.onmessage = function(event) {
            // log('\n[主线程接受到数据，数据为：]\n', event.data);

            log('group', '\n[主线程接受到数据，数据为：]\n');
            log(event.data);
            log('groupEnd');
            log('groupEnd');

            var result = event.data;
            var temp;
            if (getType(result) === 'object' && result[SEPARATOR] !== undefined) {
                temp = result[SEPARATOR].split(SEPARATOR);

                temp = {
                    key: temp[0],
                    value: temp[1] //,
                    // type: temp[2]
                }

                // if (options.data[temp.key] !== undefined) {
                options.data[temp.key] = temp.value;
                // }
            } else {
                options.message && options.message.call(this, result, event);
            }
        }

        worker.onerror = function(event) {
            log('warn', '\n[主线程遇到异常，异常信息：]\n', event.message);
            log('groupEnd');
            options.error && options.error.call(this, event);
            event.preventDefault();
        }

        DEBUG = typeof(options.DEBUG) === 'undefined' ? false : !0;

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

        if (Object.prototype.toString.call(data) === '[object Function]') {
            result['0'] = data.toLocaleString();
        } else {

            for (key in data) {
                temp = data[key];
                result[key] = (typeof temp === 'function') ? temp.toLocaleString() : temp;
            }
        }

        return JSON.stringify(result);
    };

    /**
     * [启动onmessge捕获]
     */
    function eventCatcher() {
        return onmessage = function(event) {
            log('\n[在子线程内接收到数据，数据为]：\n', event.data);

            var options = event.data;
            var data = deSerialize(options.data);
            var fns = [];

            // 引入依赖
            if (options.deps.length) {
                importScripts.apply(self, options.deps);
            }

            //
            // <del>如果没有提供需要执行的函数句柄，默认全部执行</del>
            // update note：这个功能没什么用，去掉
            // if (!options.performs.length) {
            //     options.performs = Object.keys(data).filter(function(key) {
            //         var temp = data[key];
            //         if (typeof temp === 'function') {
            //             return key;
            //         }
            //     });
            // }

            options.performs.forEach(function(key) {
                var temp = data[key];
                temp && fns.push(temp);
            });

            //
            if (options.observe.length) {
                options.observe.forEach(function(originalProp) {
                    var key = originalProp;
                    var val = data[key];
                    data['_' + key] = val;
                    Object.defineProperty(data, key, {
                        enumerable: true,
                        configurable: true,
                        get: function() {
                            return this['_' + key];
                        },
                        set: function(newVal) {
                            if (newVal !== val) {
                                var extra = {};
                                extra[SEPARATOR] = [key, newVal].join(SEPARATOR);
                                postMessage(extra);
                            }
                            this['_' + key] = newVal;
                        }
                    });

                });
            }

            (fns.length) && ((fns.length === 1) ? fns[0]() : queue(fns));
        }
    };

    /**
     * [对已经序列化的数据解码]
     * 主要对函数进行解码操作，绑定正确的作用域。
     * @param  {[String]} dataString [序列化的字符串]
     * @return {[Object]}            [解码后的对象字面量]
     */
    function deSerialize(dataString) {
        var data = JSON.parse(dataString);
        // 保证枚举时键值对是有序的
        var keys = Object.keys(data);
        var temp;
        keys.forEach(function(key) {
            temp = data[key].toString();
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

    /**
     * [getType description]
     * @param  {[type]}  object [description]
     * @return {Boolean}        [description]
     */
    function getType(object) {
        return Object.prototype.toString.call(object).replace(/\[\object|\]|\s/gi, '').toLowerCase();
    };

    /**
     * [Debugger]
     *
     * @return {[type]} [description]
     */
    function log( /* type [, arg1, arg2...etc. ]*/ ) {
        var args = Array.prototype.slice.call(arguments);
        var firstArg = args.shift();
        var isSpecified = !!~['warn', 'info', 'error', 'group', 'groupEnd'].indexOf(firstArg);
        return DEBUG && console[isSpecified ? firstArg : 'log'].apply(console, isSpecified ? args : arguments);
    }

    /**
     * [parseType description]
     * @param  {[type]} type [description]
     * @return {[type]}      [description]
     */
    function parseType(type, val) {
        var result = val;
        switch (type) {
            case 'number':
                // NaN Infinity Floats Ints
                result = 1 * result;
                break;
            case 'boolean':
                result = result === 'true' ? true : false;
                break;
            case 'null':
                result = null;
                break;
            case 'undefined':
                result = undefined;
                break;
            default:
                break;
        }
        return result;
    }
})();
