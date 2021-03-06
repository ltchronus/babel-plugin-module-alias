'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.mapToRelative = mapToRelative;
exports.mapModule = mapModule;
var path = require('path');

function createFilesMap(state) {
    var result = {};
    var opts = state.opts;
    if (!Array.isArray(opts)) {
        opts = [opts];
    }

    opts.forEach(function (moduleMapData) {
        result[moduleMapData.expose] = moduleMapData.src;
    });

    return result;
}

function resolve(filename) {
    if (path.isAbsolute(filename)) return filename;
    return path.resolve(process.cwd(), filename);
}

function mapToRelative(currentFile, module) {
    var from = path.dirname(currentFile);
    var to = path.normalize(module);
    // console.log(from, to, 'mapToRelative')
    // console.log(resolve(from), resolve(to), 'mapToRelative')
    from = path.isAbsolute(from) ? from : path.resolve(process.env.PWD, from);
    to = path.isAbsolute(to) ? to : path.resolve(process.env.PWD, to);
    // console.log(from, to, 'mapToRelative')
    var moduleMapped = path.relative(from, to);

    // Support npm modules instead of directories
    if (moduleMapped.indexOf('npm:') !== -1) {
        var _moduleMapped$split = moduleMapped.split('npm:');

        var _moduleMapped$split2 = _slicedToArray(_moduleMapped$split, 2);

        var npmModuleName = _moduleMapped$split2[1];

        return npmModuleName;
    }

    if (moduleMapped[0] !== '.') moduleMapped = './' + moduleMapped;
    return moduleMapped;
}

function mapModule(source, file, filesMap) {
    var moduleSplit = source.split('/');

    var src = void 0;
    while (moduleSplit.length) {
        var m = moduleSplit.join('/');
        if (filesMap.hasOwnProperty(m)) {
            src = filesMap[m];
            break;
        }
        moduleSplit.pop();
    }

    if (!moduleSplit.length) {
        // no mapping available
        return null;
    }

    var newPath = source.replace(moduleSplit.join('/'), src);
    return mapToRelative(file, newPath);
}

exports.default = function (_ref) {
    var t = _ref.types;

    function transformRequireCall(nodePath, state, filesMap) {
        if (!t.isIdentifier(nodePath.node.callee, { name: 'require' }) && !(t.isMemberExpression(nodePath.node.callee) && t.isIdentifier(nodePath.node.callee.object, { name: 'require' }))) {
            return;
        }

        var moduleArg = nodePath.node.arguments[0];
        if (moduleArg && moduleArg.type === 'StringLiteral') {
            // console.log('transformRequireCall', modulePath)
            var modulePath = mapModule(moduleArg.value, state.file.opts.filename, filesMap);
            if (modulePath) {
                nodePath.replaceWith(t.callExpression(nodePath.node.callee, [t.stringLiteral(modulePath)]));
            }
        }
    }

    function transformImportCall(nodePath, state, filesMap) {
        var moduleArg = nodePath.node.source;

        if (moduleArg && moduleArg.type === 'StringLiteral') {
            var modulePath = mapModule(moduleArg.value, state.file.opts.filename, filesMap);
            // console.log('transformImportCall', modulePath, moduleArg.value, filesMap)
            if (modulePath) {
                nodePath.replaceWith(t.importDeclaration(nodePath.node.specifiers, t.stringLiteral(modulePath)));
            }
        }
    }

    return {
        visitor: {
            CallExpression: {
                exit: function exit(nodePath, state) {
                    return transformRequireCall(nodePath, state, createFilesMap(state));
                }
            },
            ImportDeclaration: {
                exit: function exit(nodePath, state) {
                    // console.log(1111111)
                    return transformImportCall(nodePath, state, createFilesMap(state));
                }
            }
        }
    };
};
