function loadShader(gl, _type, _src) {
    const shader = gl.createShader(_type);
    gl.shaderSource(shader, _src);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('failed to compileShader: ' + gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function loadProgram(gl, _vsCode, _fsCode) {
    const vs = loadShader(gl, gl.VERTEX_SHADER, _vsCode);
    const fs = loadShader(gl, gl.FRAGMENT_SHADER, _fsCode);

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        alert('Unable to link Program: ' + gl.getProgramLog(prog));
        return;
    }
    return prog;
}

function loadTex(gl, img) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    const lvl = 0;
    const inFormat = gl.RGBA;
    const w = 1;
    const h = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);
     gl.bindTexture(gl.TEXTURE_2D, tex);
     gl.texImage2D(gl.TEXTURE_2D, lvl, inFormat,
             srcFormat, srcType, img);
     const wI = img.width;
     const hI = img.height;
     if ((wI & (wI - 1)) === 0 && (hI & (hI - 1)) === 0) {
         gl.generateMipmap(gl.TEXTURE_2D);
     }
     else {
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     }
    return tex;
}

function loadNormalPipe(gl) {
    const vsCode = `
    attribute vec2 aVecPos;
    attribute vec2 aUV;

    uniform mat4 uView;
    uniform mat4 uProj;

    varying lowp vec2 uv;

    void main() {
        gl_Position = uProj * uView * vec4(aVecPos, 0, 1);
        uv = aUV;
    }
    `;

    const fsCode = `
    uniform sampler2D uSampler;
    varying lowp vec2 uv;
    void main() {
        gl_FragColor = texture2D(uSampler, uv);
    }
    `;

    const prog = loadProgram(gl, vsCode, fsCode);

    return {
        prog: prog,
        attrLoc: {
            pos: gl.getAttribLocation(prog, 'aVecPos'),
            color: gl.getAttribLocation(prog, 'aColor'),
            uv: gl.getAttribLocation(prog, 'aUV'),
        },
        uniLoc: {
            proj: gl.getUniformLocation(prog, 'uProj'),
            view: gl.getUniformLocation(prog, 'uView'),
            uSamp: gl.getUniformLocation(prog, 'uSampler'),
        },
    };
}
function setupScene(gl) {
	gl.clearColor(0,0,0,1);
    gl.clearDepth(1);
    // gl.enable(gl.DEPTH_TEST);
    // gl.depthFunc(gl.LESS);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	// gl.blendFunc(gl.ONE, gl.ZERO);
	return {clear: function(){gl.clear(gl.DPETH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);}};
}
function setupAstroid(gl) {
	const progData = loadNormalPipe(gl);

    const positons = gl.createBuffer();
    const color = gl.createBuffer();
    const uv = gl.createBuffer();
    const index = gl.createBuffer();
    const planeP = [-1,1, 1, 1, -1, -1, 1, -1];
    const planeUV = [0,1, 1,1, 0,0, 1,0];
    const planeIdx = [0, 1, 2, 3];
    gl.bindBuffer(gl.ARRAY_BUFFER, positons);
    gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array(planeP),
            gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, uv);
    gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array(planeUV),
            gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 
            new Uint16Array(planeIdx),
            gl.STATIC_DRAW);
    const tex = loadTex(gl, astroidImages[0]);

    Object.assign(progData, {
        buffer: {
        pos: positons, 
        color,
        uv,
        index,
        },
        tex: [tex]});
    

    return {sProg: progData, gl: gl, draw: function(proj, view) { drawNormal(this.gl, this.sProg, proj, view); }};
}    
function drawNormal(gl, _sProg, project, view) {

    const fov = 45 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
	
    {
        const numComp = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;

        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, _sProg.buffer.pos);
        gl.vertexAttribPointer(
                _sProg.attrLoc.pos,
                numComp,
                type,
                normalize,
                stride,
                offset
                );
        gl.bindBuffer(gl.ARRAY_BUFFER, _sProg.buffer.uv);
        gl.vertexAttribPointer(
                _sProg.attrLoc.uv,
                2,
                gl.FLOAT,
                false,
                0,
                0
                );
    }
    gl.enableVertexAttribArray(_sProg.attrLoc.pos);
    gl.enableVertexAttribArray(_sProg.attrLoc.uv);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, _sProg.buffer.index);
    
    gl.useProgram(_sProg.prog);

    gl.uniformMatrix4fv(_sProg.uniLoc.proj, false, project);
    gl.uniformMatrix4fv(_sProg.uniLoc.view, false, view);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, _sProg.tex[0]);
    gl.uniform1i(_sProg.uniLoc.uSamp, 0);


    {
        const offset = 0;
        const vertCount = 4;
        gl.drawElements(gl.TRIANGLE_STRIP,
                vertCount,
                gl.UNSIGNED_SHORT,
                offset);
    }

    gl.disableVertexAttribArray(_sProg.attrLoc.pos);
    gl.disableVertexAttribArray(_sProg.attrLoc.uv);
}