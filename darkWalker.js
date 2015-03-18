/**
 *  Dark Walker
 *  Web Worker��ģ���̨���еĹ�����
 *
 *  ��һ�����ֽ���backgroud�����ڱ�ʾ�ں�̨���У�
 *  ����CSSд���ˣ���������ܾ��úܱ�Ť��
 *
 *  ����ΪDark walker���ڰ��е�����
 *  ��ʾ�������Ĳ������ڰ��н��У�
 *  walker �� worker г��������ͬ��֮��
 *
 */
;
(function __dark_walker_package__() {

    var DEBUG = false;

    var SEPARATOR = '_i0705n_';

    // ����Ƿ�����worker�߳�������
    var isInWorker = !!self.WorkerLocation;

    // �������worker�����У�����onmessage����
    if (isInWorker) {
        log('\n[�ѽ���worker�߳�]\n');
        eventCatcher();
        // ������window�������׳� worker�İ�װ����
    } else {
        window.darkWalker = darkWalker;
        window.getType = getType;
    }


    /**
     * [����worker�İ�װ��]
     * ÿ�ε��ù���ͬһ��worker������
     * ����ʱ���������workerʵ������������ֹ���߳�
     * @param  {[Object]} options [�����ļ�]
     *
     *      deps: [], // ��Ҫͨ�� importScripts ����Ľű��ļ������ٵ�һʱ�����
     *      uri : '',  // worker�ļ��ĵ�ַ��Ҳ���Ǳ��ļ��ĵ�ַ
     *      data: {} || function, // ��Ҫ����worker��������ݣ�����ɱ����Ը����ݵĴ�����
     *                           // Ҳ�����Ǹ�function
     *      performs: [], // ���ݣ�data��������Ϻ���Ҫִ�е�data�еĴ������ľ��
     *                    // ��ѡ ���粻�ṩ��Ĭ��Ϊ���ݣ�data���е����ṩ�ĺ�����
     *                    // �����ᰴ�ո����ľ��˳��ִ�У����ṩһ��'next'���������������
     *                    // �����߿�ʹ��'next'��������ʱִ����һ������
     *      message: function(data, event) {...} // worker��onmessage
     *      error  : function(errorEvent) {...}  // worker��onerror
     *
     *
     * @return {[Object]}         [����ǰworkerʵ������]
     */
    function darkWalker(options) {

        if (!darkWalker.worker) {
            darkWalker.worker = new Worker(options.uri);
        } else {
            darkWalker.worker.terminate();
            darkWalker.worker = null;
            return darkWalker(options);
        }

        log('group', '\n[================== ������Ϣ ==================]\n');

        var worker = darkWalker.worker;
        var data = serializeData(options.data);

        // if (options.observe.length) {
        //     options.observe.forEach(function(item, index) {
        //         options.observe[index] = [item, SEPARATOR, typeof(item)].join('');
        //     });
        // }

        worker.postMessage({
            deps: options.deps || [],
            performs: options.performs || [],
            data: data,
            observe: options.observe || []
        });

        worker.onmessage = function(event) {
            // log('\n[���߳̽��ܵ����ݣ�����Ϊ��]\n', event.data);

            log('group', '\n[���߳̽��ܵ����ݣ�����Ϊ��]\n');
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
            log('warn', '\n[���߳������쳣���쳣��Ϣ��]\n', event.message);
            log('groupEnd');
            options.error && options.error.call(this, event);
            event.preventDefault();
        }

        return worker;
    };

    /**
     * [���л�����]
     * ��Ϊ�����data������к������ʽ��
     * worker�ᱨ��
     * ���ʹ��JSON.stringifyֱ�����л�
     * �������ʽ��ᶪʧ
     * @param  {[Object]} data [��Ҫ���л�������]
     * @return {[String]}      [���л��������]
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
     * [����onmessge����]
     */
    function eventCatcher() {
        return onmessage = function(event) {
            // log('group', '\n[�����߳��ڽ��յ����ݣ�����Ϊ]��\n');
            // log(event.data);
            // log('groupEnd');

            log('\n[�����߳��ڽ��յ����ݣ�����Ϊ]��\n', event.data);
            var options = event.data;
            var data = deSerialize(options.data);
            var fns = [];

            // ��������
            if (options.deps.length) {
                importScripts.apply(self, options.deps);
            }

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
            if (options.observe.length) {

                options.observe.forEach(function(originalProp) {
                    // var originalProp = originalProp.split(SEPARATOR);
                    var key = originalProp; // [0];
                    // var type = originalProp[1];
                    var val = data[key];
                    // if (val !== undefined) {
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
                    // }
                });
            }

            // 
            (fns.length === 1) ? fns[0](): queue(fns);
        }
    };

    /**
     * [���Ѿ����л������ݽ���]
     * ��Ҫ�Ժ������н������������ȷ��������
     * @param  {[String]} dataString [���л����ַ���]
     * @return {[Object]}            [�����Ķ���������]
     */
    function deSerialize(dataString) {
        var data = JSON.parse(dataString);
        // ��֤ö��ʱ��ֵ���������
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
     * [���к���]
     * @param  {[Array]} fns     [��������]
     * @param  {[Object]} context [������ִ��������]
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
