function loadShader(gl, _type, _src) {
	const shader = gl.createShader(_type);
	gl.shaderSource(shader, _src);
	gl.compileShader(shader);
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error("failed to compile Shader" + gl.getShaderInfo(shader));
		return null;
	}
	return shader;
}

function loadProg(gl, _vsCode, _fsCode) {
	const vs = loadShader(gl, gl.VERTEX_SHADER, _vsCode);
	const fs = loadShader(gl, gl.FRAGMENT_SHADER, _fsCode);
	
	const prog = gl.createProgram();
	gl.attachShader(prog, vs);
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);
	
	if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		console.err("unable to link programm: " + gl.getProgramLog(prog));
		return null;
	}
	return prog;
}

function loadTex(gl, _img) {
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	
	const wI = _img.width;
	const hI = _img.height;
	if((wI & (wI - 1) )=== 0 && (hI & (hI - 1)) === 0) {
		gl.generateMipmap(gl.TEXTURE_2D);
	}
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _img);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	return tex;
}

function loadNormalPip(gl) {
	const vsCode = `
	attribute vec2 aVecPos;
	attribute vec2 aUV;
	
	uniform mat4 uView;
	uniform mat4 uProj;
	
	varying lowp vec2 uv;
	void main() {
		gl_Position = vec4(aVecPos, -1, 1); //uProj * uView * aVecPos;
		uv = aUV;
	}`;
	const fsCode = `
	uniform sampler2D uSampler;
	varying lowp vec2 uv;
	void main() {
		gl_FragColor = vec4(1, 1, 0, 1) + texture2D(uSampler, uv);
	}`
	
	const prog = loadProg(gl, vsCode, fsCode);
	return {
		prog,
		attrLoc: {
			pos: gl.getAttribLocation(prog, 'aVecPos'),
			uv: gl.getAttribLocation(prog, 'aUV'),
		},
		uniLoc: {
			proj: gl.getUniformLocation(prog, 'uProj'),
			view: gl.getUniformLocation(prog, 'uView'),
			uSamp: gl.getUniformLocation(prog, 'uSampler'),
		}
	};
}

const planeP = [-1,1, 1,1, -1,-1, 1,-1];
const planeUV = [0,1, 1,1, 0,0, 1,0];
function setupAstroid(gl, imgs) {
	const prog = loadNormalPip(gl);
	const uv = gl.createBuffer();
	const pos = gl.createBuffer();
	
	gl.bindBuffer(gl.ARRAY_BUFFER, pos);
	gl.bufferData(gl.ARRAY_BUFFER, 
		new Float32Array(planeP),
		gl.STATIC_DRAW);
		
	gl.bindBuffer(gl.ARRAY_BUFFER, uv);
	gl.bufferData(gl.ARRAY_BUFFER,
		new Float32Array(planeUV),
		gl.STATIC_DRAW);
	const tex = loadTex(gl, imgs.astroid1);
	
	Object.assign(prog, {
		buffer: {
			pos,
			uv,
		},
		tex: [tex]
	});
	
	return {gl, prog, draw: function(mProj, mView) { drawNormal(this.gl, this.prog, mProj, mView);}};
}

function setupScene(gl) {
	gl.clearColor(0, 0, 0, 0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.disable(gl.CULL_FACE);
	return {clear: function() { this.gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)}, gl}
}

function drawNormal(gl, _prog, _mProj, _mView) {
	gl.bindBuffer(gl.ARRAY_BUFFER, _prog.buffer.pos);
	gl.vertexAttribPointer(
		_prog.attrLoc.pos,
		2,
		gl.FLOAT,
		false,
		4 * 2,
		0
	);
	gl.bindBuffer(gl.ARRAY_BUFFER, _prog.buffer.uv);
	gl.vertexAttribPointer(
		_prog.attrLoc.uv,
		2, 
		gl.FLOAT,
		false,
		4*2,
		0);
		
	gl.enableVertexAttribArray(_prog.attrLoc.pos);
	gl.enableVertexAttribArray(_prog.attrLoc.uv);
	
	gl.useProgram(_prog.prog);
	
	gl.uniformMatrix4fv(_prog.uniLoc.proj, false, _mProj);
	gl.uniformMatrix4fv(_prog.uniLoc.view, false, _mView);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, _prog.tex[0]);
	gl.uniform1i(_prog.uniLoc.uSamp, 0);
	
	gl.drawArrays(
		gl.TRIANGLE_STRIP,
		4,
		0
	);
	
	gl.disableVertexAttribArray(_prog.attrLoc.pos);
	gl.disableVertexAttribArray(_prog.attrLoc.uv);
}