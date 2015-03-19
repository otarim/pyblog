fis.config.init({
	project: {
		// 设定编码
		charset: 'gbk',
		md5Length: 10
	}
})
// fis 全局变量
// fis.config.set('project.md5Length', 8); 依赖注入
// fis所有的插件配置都支持定义一个 数组或者逗号分隔的字符串序列 来依次处理文件内容。
fis.config.set('modules.postpackager', 'simple')
fis.config.merge({
	// 项目配置
	project: {
		// charset: 'utf-8',
		md5Connector: '.', //设置 MD5 跟 string 的连接方式
		exclude: ['/logs','/node_modules','/webSession','/lib','static/bower_components','static/upload'], //排除的目录或者文件
		fileType: {
			text: '', //告诉 fis 那些文件是文本
			image: '' //告诉 fis 那些文件是图片
		}
	},
	// 插件配置
	modules: {
		parser: {
			// 指定编译器
			// 由于parser的主要职责是统一标准语言，因此它经常会和 roadmap.ext 配置配合使用，用于标记某个后缀的文件在parser阶段之后当做某种标准语言进行处理。
			// md : 'marked', //fis-parser-marked
			coffee: 'coffee-script',
			less: 'less'
		},
		// preprocessor: {
		// 	// 预处理
		// 	//  image-set retina
		// },
		postprocessor: {
			// 标准化处理之后，amd打包
			// js : 'jswrapper',
			// 配置在 settings 里面配置
			// simple: 'simple'
		},
		postpackager: 'simple',
		lint: {
			js: 'jshint'
		},
		optimizer: {
			// 压缩
			js : 'uglify-js',
			css : 'clean-css',
			png : 'png-compressor'
		},
		spriter: 'csssprites' // 使用 csssprites ，settings 指定参数
	},
	roadmap: {
		path: [{
			// 所有 css 都执行 sprite 操作，配合 sprite 以及-p输出
			reg: '**.css',
			useSprite: true
		},{
			//是模块化的js文件（标记为这种值的文件，会进行amd或者闭包包装）
			reg: '/lib/ota.js',
			charset : 'gbk',
            isMod : true,
		},{
			// icons 目录下的文件不要加 md5
			reg: 'lib/icons/**',
			useHash: false
		}],
		ext: {
			less: 'css',
			md: 'html', //markdown 文件编译后缀名为 html
			coffee: 'js'
		},
		domain: {
			// 加入 --domains 控制是否添加域名
			'image': 'http://cdn.qiniu.com',
			'**.js': 'http://js.3conline.com.cn/pconline/2014/live/js'
		}
	},
	// 插件运行配置
	settings : {
        postprocessor : {
            jswrapper : {
                //wrap type. if omitted, it will wrap js file with '(function(){...})();'.
                type : 'amd',
                //you can use template also, ${content} means the file content
                //template : '!function(){${content}}();',
                //wrap all js file, default is false, wrap modular js file only.
                wrapAll : true
            }
        },
        postpackager: {
        	simple: {
        		autoCombine: true
        	}
        },
        optimizer: {
        	'uglify-js': {
        		// ...
        	},
        	'clean-css': {
        		// ...
        	}
        },
        spriter: {
        	'csssprites': {
        		//使用release命令时，添加 -p 或者 --pack 参数。由于csssprite处理需要消耗一定的计算资源，并且开发过程中并不需要时刻做图片合并，因此fis将其定义为打包处理流程，启动csssprite处理需要指定--pack参数。
				//只有 打包的css文件 或者 roadmap.path 中 useSprite 属性标记为 true 的文件才会进行csssprite处理，因此请合理安排要进行csssprite处理的文件，尽量对合并后的文件做处理。
				//在css中引用图片时，只要加上 ?__sprite 这个query标记就可以使用csssprite了。详情请参考fis-spriter-csssprites插件的 使用文档。
				margin: 2,
				layout: 'matrix'
        	}
        }
    },
    deploy: {
    	// -d out 触发这个动作
    	'out': {
    		to: 'dest'
    	},
    	'remote': {
    		// ....
    	}
    },
    pack: {
    	'pkg/all.css': '**.css',
    	// 'pkg/lib.js': '**.js'
    }

})

// -wL 注意代理问题
