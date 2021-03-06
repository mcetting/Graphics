// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec4 b_Position;
  attribute vec4 surfaceNormal_Position;
  attribute vec4 a_Color;
  attribute vec4 a_Normal;
  attribute vec4 directionalLight_Position;
  uniform mat4 u_MvpMatrix;
  
  uniform int doIt;
  uniform bool clicked;

  uniform bool directional;
  uniform bool point;

  varying vec4 v_Color;
  void main() {
    if(doIt==1){
        gl_Position=u_MvpMatrix*b_Position;
        v_Color = vec4(0,0,0,1);
    }else if(doIt==0){
        gl_Position = u_MvpMatrix * a_Position;
        if(clicked){
           v_Color = a_Color;
        }else{
           v_Color = vec4(1,0,0,255);
        }
    }else if(doIt==2){
        gl_Position=u_MvpMatrix*surfaceNormal_Position;
        v_Color = vec4(1,0,0,1);
    }else if(doIt==3){
      //if3
      gl_Position=u_MvpMatrix*directionalLight_Position;
      if(directional){
        if(clicked){
          v_Color=vec4(1,0,0,1);
        }else{
          v_Color = vec4(1,0,0,255);
        }

      }else{
        if(clicked){
           v_Color=vec4(.4,.4,.4,1);
        }else{
           v_Color = vec4(1,0,0,255);
        }
      }
    }else if(doIt==4){
      gl_Position = u_MvpMatrix * a_Position;
      if(point){
        if(clicked){
          v_Color = vec4(1,1,0,255);
        }else{
          v_Color = vec4(1,0,0,255);
        }
      }else{
        if(clicked){
          v_Color = vec4(.4,.4,.4,255);
        }else{
          v_Color = vec4(1,0,0,255);
        }
      }
    }
  }`;

// Fragment shader program
var FSHADER_SOURCE = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  uniform int objectIndex;
  varying vec4 v_Color;
  void main() {
    if(objectIndex==0){
        gl_FragColor = vec4(v_Color.rgb,1);
    }else if(objectIndex==1){
        gl_FragColor = vec4(v_Color.rgb,.99);
    }else if(objectIndex==2){
        gl_FragColor = vec4(v_Color.rgb,.98);
    }

  }`;
//global lighting variables
var gloss=1;
//second point light
var secondLightPosition = new Vector3([0,1,0]);
var secondLightColor = new Vector3([1,1,0]);
//directional lighting
var lightDirection = new Vector3([1,1,1]);
var specularColor = new Vector3([0,1,0])
var lightColor = new Vector3([1,1,1]);
var color = new Vector3([1,0,0]);
//array allocation
var vertices = new Float32Array(5000);
var cVert = new Float32Array(5000);
var cubeVertices = new Float32Array(5000);
var dirVert = new Float32Array(100);
var dirIndices = new Uint16Array(2);

var lineVert= new Float32Array(5000);
var indices = new Uint16Array(5000);
var cubeIndices = new Uint16Array(5000);

var normals = new Float32Array(5000);
var colors = new Float32Array(5000);
var surfaceNormals = new Float32Array(5000);
var numOfNormals=0;
//buffers and attributes
var vertexBuffer;
var indexBuffer;
var lineBuffer;
var colorBuffer;
var normalBuffer;

var a_Position;
var a_Color;
var b_Position;
var uniformGPos;
var uniformObjectIndex;
var surfaceNormal_Position;
var directionalLight_Position;
var boolio;
var clicked;
var pointBool;
var directionalBool;
//itterators
var numOfIndex=0;
var numOfCyl=0;
var numberOfColors=0;
var numOfVerts=0;
var numOfVertsC=0;
var numOfSurfaceNormals=0;
//gl reference
var gl;
//misc
var radius=.05;
var debug=false;
var enableMove=true;
var perspectiveBool=false;
var displayN = false;
var u_MvpMatrix;
var mvpMatrix;
var slider;
var radiusSlider;
var mode=true;
var specToggle=true;
var angle=10;
var globalPos=new Vector3([0,0,5]);

//both start as true
var directionalLightBool=true;
var pointLight=true;
//main function
//overright
function main() {
  //-----------------------------------------------
  //ROTATION
  document.onkeydown = function(ev){
    if(ev.keyCode==65){
      //A
      //figure you how to change the light direction for dynamic light
      var mat=new Matrix4();
      mat.setRotate(-angle,0,1,0);
      globalPos=mat.multiplyVector3(globalPos);
      mvpMatrix.setPerspective(30,1,1,100);
      mvpMatrix.lookAt(globalPos.elements[0], globalPos.elements[1], globalPos.elements[2], 0, 0, 0, 0, 1, 0);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      if(!mode){
        smoothShading();
      }else{
        flatShading();
      }
    }else if(ev.keyCode==68){
      //D
      var mat=new Matrix4();
      mat.setRotate(angle,0,1,0);
      globalPos=mat.multiplyVector3(globalPos);
      mvpMatrix.setPerspective(30,1,1,100);
      mvpMatrix.lookAt(globalPos.elements[0], globalPos.elements[1], globalPos.elements[2], 0, 0, 0, 0, 1, 0);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      if(!mode){
        smoothShading();
      }else{
        flatShading();
      }
    }
  }
  //-----------------------------------------------

  slider=document.getElementById("sliderValue");
  slider.oninput = function(){
    gloss = this.value;
    //recalc the lighting
    if(mode){
      loading();
      bufferHandling();
    }else{
      smoothShading();
    }
  }
  radiusSlider=document.getElementById("radiusSlider");
  radiusSlider.oninput = function(){
    radius = this.value;
    //recalc the lighting
  }
  setupIOSOR("fileName");
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');
  // Get the rendering context for WebGL
  gl = WebGLUtils.setupWebGL(canvas,{preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Set the vertex coordinates and color
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  pointBool = gl.getUniformLocation(gl.program, 'point');
  gl.uniform1i(pointBool,1);//sets doIt in the shader

  directionalBool = gl.getUniformLocation(gl.program, 'directional');
  gl.uniform1i(directionalBool,1);//sets doIt in the shader

  // Get the storage location of u_MvpMatrix
  u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) {
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }
  boolio = gl.getUniformLocation(gl.program, 'doIt');
  gl.uniform1i(boolio,0);//sets doIt in the shader

  uniformObjectIndex = gl.getUniformLocation(gl.program, 'objectIndex');
  gl.uniform1i(uniformObjectIndex,0);//sets doIt in the shader

  clicked = gl.getUniformLocation(gl.program, 'clicked');
  gl.uniform1i(clicked,1);//sets the default to normal draw

  gl.clearColor(.9, .9, .9, 1.0);
  gl.enable(gl.DEPTH_TEST);
  // Set the eye point and the viewing volume
  
  mvpMatrix = new Matrix4();

  mvpMatrix.setOrtho(-1, 1,-1, 1,-1, 1);
  // Pass the model view projection matrix to u_MvpMatrix
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  // Clear color and depth buffer
  canvas.onmousedown = function(ev){ click(ev, gl, canvas, a_Position); };
  canvas.onmousemove=function(ev){hover(ev,gl,canvas,a_Position);};
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  createDirectionLight();
  createCube();
  bufferHandling();
}
function createCube(){
  var tempOffset=.1;
  cubeVertices = new Float32Array([   // Vertex coordinates
     tempOffset, tempOffset+1, tempOffset,  -tempOffset, tempOffset+1, tempOffset,  -tempOffset,-tempOffset+1, tempOffset,   tempOffset,-tempOffset+1, tempOffset,    // v0-v1-v2-v3 front
     tempOffset, tempOffset+1, tempOffset,   tempOffset,-tempOffset+1, tempOffset,   tempOffset,-tempOffset+1,-tempOffset,   tempOffset, tempOffset+1,-tempOffset,    // v0-v3-v4-v5 right
     tempOffset, tempOffset+1, tempOffset,   tempOffset, tempOffset+1,-tempOffset,  -tempOffset, tempOffset+1,-tempOffset,  -tempOffset, tempOffset+1, tempOffset,    // v0-v5-v6-v1 up
    -tempOffset, tempOffset+1, tempOffset,  -tempOffset, tempOffset+1,-tempOffset,  -tempOffset,-tempOffset+1,-tempOffset,  -tempOffset,-tempOffset+1, tempOffset,    // v1-v6-v7-v2 left
    -tempOffset,-tempOffset+1,-tempOffset,   tempOffset,-tempOffset+1,-tempOffset,   tempOffset,-tempOffset+1, tempOffset,  -tempOffset,-tempOffset+1, tempOffset,    // v7-v4-v3-v2 down
     tempOffset,-tempOffset+1,-tempOffset,  -tempOffset,-tempOffset+1,-tempOffset,  -tempOffset, tempOffset+1,-tempOffset,   tempOffset, tempOffset+1,-tempOffset     // v4-v7-v6-v5 back
  ]);
  cubeIndices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
  ]);
}
var offset = .01;
function createRect(){
  dirVert[0]=-offset;
  dirVert[1]=offset;
  dirVert[2]=0;

  dirVert[3]=offset;
  dirVert[4]=-offset;
  dirVert[5]=0;

  dirVert[6]=1-offset;
  dirVert[7]=1+offset;
  dirVert[8]=1;

  dirVert[9]=1+offset;
  dirVert[10]=1-offset;
  dirVert[11]=1;

  bufferHandling();

}
function createDirectionLight(){
  createRect();
}
function swapPersp(){
  if(perspectiveBool)
  {
    mvpMatrix.setOrtho(-1, 1,-1, 1,-1, 1);
    perspectiveBool=false;
  }else{
    mvpMatrix.setPerspective(30, 1, 1, 100);
    mvpMatrix.lookAt(0, 0, 5, 0, 0, 0, 0, 1, 0);
    perspectiveBool=true;
  }
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  bufferHandling();
}

//indices form triangles
function initVertexBuffers(gl) {
  //creates all 3 used buffers for drawing
  vertexBuffer = gl.createBuffer();
  indexBuffer = gl.createBuffer();
  lineBuffer = gl.createBuffer();
  colorBuffer = gl.createBuffer();
  normalBuffer = gl.createBuffer();
  directionalBuffer=gl.createBuffer();

  var FSIZE = cVert.BYTES_PER_ELEMENT;

  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, lineVert, gl.STATIC_DRAW);

  b_Position = gl.getAttribLocation(gl.program,'b_Position');
  gl.vertexAttribPointer(b_Position, 3, gl.FLOAT, false, FSIZE * 3, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cVert, gl.STATIC_DRAW);

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 3, 0);
  gl.enableVertexAttribArray(a_Position);
  //do colors  
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

  a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }

  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 3, 0);
  gl.enableVertexAttribArray(a_Color);

  gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);
  surfaceNormal_Position = gl.getAttribLocation(gl.program, 'surfaceNormal_Position');
  if(surfaceNormal_Position < 0) {
    console.log('Failed to get the storage location of surfaceNormal_Position');
    return -1;
  }

  gl.vertexAttribPointer(surfaceNormal_Position, 3, gl.FLOAT, false, FSIZE * 3, 0);
  gl.enableVertexAttribArray(surfaceNormal_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER,directionalBuffer);
  directionalLight_Position = gl.getAttribLocation(gl.program, 'directionalLight_Position');
  if(directionalLight_Position < 0) {
    console.log('Failed to get the storage location of directionalLight_Position');
    return -1;
  }
  gl.vertexAttribPointer(directionalLight_Position, 3, gl.FLOAT, false, FSIZE * 3, 0);
  gl.enableVertexAttribArray(directionalLight_Position);
  gl.disableVertexAttribArray(directionalLight_Position);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}
//duplicate the circle verticies
function duplicateVerts(rotMatrix,point){
    var pVec=new Vector3([0,0,radius]);
    cVert[numOfVertsC]=point.x;
    cVert[numOfVertsC+1]=point.y;
    cVert[numOfVertsC+2]=radius;
    numOfVertsC+=3;
    var num=0;
    var amountOfV=numOfVertsC;
    for (var i = 0; i <= 10; i++) {
      pVec=rotMatrix.multiplyVector3(pVec);
      num=amountOfV+i*3;
      cVert[num]=point.x+pVec.elements[0];
      cVert[num+1]=point.y+pVec.elements[1];
      cVert[num+2]=pVec.elements[2];
      numOfVertsC+=3;
    }
}

//get a start and an end point then generate based on them
function drawCircle(gl){
  //stores the data for the first and second point of the cylynders base
  var frontPoint={
    x:lineVert[numOfVerts-9],
    y:lineVert[numOfVerts-8]
  }
  var backPoint={
    x:lineVert[numOfVerts-6],
    y:lineVert[numOfVerts-5]
  }
  //creates the I matrix at 4x4
  var rotMatrix=new Matrix4();
  //gives the axis
  var rot=new Vector3([backPoint.x-frontPoint.x,backPoint.y-frontPoint.y,0]);
  //normalize it
  rot=rot.normalize();
  //makes its magnitude 1
  //pass it the xyz of the normaized rotation axis
  rotMatrix.setRotate(30,rot.elements[0],rot.elements[1],rot.elements[2]);
  //point vector
  
  duplicateVerts(rotMatrix,frontPoint);//36
  duplicateVerts(rotMatrix,frontPoint);//36-72
  if(numOfCyl>0){
    transitionTest();//calculateIndicies();//the transitions fuck up everything
  }

  duplicateVerts(rotMatrix,backPoint);//144
  duplicateVerts(rotMatrix,backPoint);

  calculateIndicies();

  calculateLighting();
  bufferHandling();
  //console.log(numOfNormals);
  //debugPrint();
  
}
function transitionTest(){
  var index = numOfVertsC/3 - 48;
  //console.log("GIMME MY INDEX: "+index);
  var p = numOfIndex;
  var flipFlop=false;
  for(i=0;i<66;i+=6){
    if(!flipFlop){
      //triangle 1
      indices[i+p] =   index;
      indices[i+p+1] = index + 24 + 1;
      indices[i+p+2] = index + 24;
      //calculate the normal

      //triangle 2
      indices[i+p+3] = index;
      indices[i+p+4] = index + 1;
      indices[i+p+5] = index + 24 + 1;
      //normalCalculation(index,true);
    }else{
      //triangle 1
      indices[i+p] =   index + 12;
      indices[i+p+1] = index + 24 + 1 + 12;
      indices[i+p+2] = index + 24 + 12;
      //calculate the normal
      //triangle 2
      indices[i+p+3] = index + 12;
      indices[i+p+4] = index + 1 + 12;
      indices[i+p+5] = index + 24 + 1 + 12;
      //the problem lies within
      //normalCalculation(index, false);

    }
    if(flipFlop){
      flipFlop =false;
    }else{
      flipFlop = true;
    }
    index++;
    numOfIndex+=6;
    //then do it in reverse
  }
  indices[i+p] =   index+12;
  indices[i+p+1] = numOfVertsC/3 - 12;
  indices[i+p+2] = index+36;
  //also causing problems
  //endNormals(index);
  
  indices[i+p+3] = index+12;
  indices[i+p+4] = numOfVertsC/3 - 36;//48-48=0+12=12->0
  indices[i+p+5] = numOfVertsC/3 - 12;//24

  numOfIndex+=6;
  numOfCyl++;
}
function calculateIndicies(){
    var index = numOfVertsC/3 - 48;
    //console.log("GIMME MY INDEX: "+index);
    var p = numOfIndex;
    var flipFlop=false;
    for(i=0;i<66;i+=6){
      if(!flipFlop){
        //triangle 1
        indices[i+p] =   index;
        indices[i+p+1] = index + 24 + 1;
        indices[i+p+2] = index + 24;
        //calculate the normal

        //triangle 2
        indices[i+p+3] = index;
        indices[i+p+4] = index + 1;
        indices[i+p+5] = index + 24 + 1;
        normalCalculation(index,true);
      }else{
        //triangle 1
        indices[i+p] =   index + 12;
        indices[i+p+1] = index + 24 + 1 + 12;
        indices[i+p+2] = index + 24 + 12;
        //calculate the normal
        //triangle 2
        indices[i+p+3] = index + 12;
        indices[i+p+4] = index + 1 + 12;
        indices[i+p+5] = index + 24 + 1 + 12;
        //the problem lies within
        normalCalculation(index, false);

      }
      if(flipFlop){
        flipFlop =false;
      }else{
        flipFlop = true;
      }
      index++;
      numOfIndex+=6;
      //then do it in reverse
    }
    indices[i+p] =   index+12;
    indices[i+p+1] = numOfVertsC/3 - 12;
    indices[i+p+2] = index+36;
    //also causing problems
    endNormals(index);
    
    indices[i+p+3] = index+12;
    indices[i+p+4] = numOfVertsC/3 - 36;//48-48=0+12=12->0
    indices[i+p+5] = numOfVertsC/3 - 12;//24

    numOfIndex+=6;
    numOfCyl++;

}
function endNormals(index){
    //calculates the proper end normal by hand
    var normal=new Vector3();
    var vec1=new Vector3();
    var vec2=new Vector3();
    //36 in first run
    vec1.elements[0]=cVert[numOfVertsC-36]-cVert[(index+12)*3];
    vec1.elements[1]=cVert[(numOfVertsC-36)+1]-cVert[((index+12)*3)+1];
    vec1.elements[2]=cVert[(numOfVertsC-36)+2]-cVert[((index+12)*3)+2];
    //do vec2
    vec2.elements[0]=cVert[(index+36)*3]-cVert[(numOfVertsC-36)];
    vec2.elements[1]=cVert[((index+36)*3)+1]-cVert[(numOfVertsC-36)+1];
    vec2.elements[2]=cVert[((index+36)*3)+2]-cVert[(numOfVertsC-36)+2];
    //console.log("index: "+index+" numOfVertsC: "+numOfVertsC);
    //do the cross product to make the normal of the first triangle
    normal.elements[0] = vec1.elements[1] * vec2.elements[2] - vec1.elements[2] * vec2.elements[1];
    normal.elements[1] = vec1.elements[2] * vec2.elements[0] - vec1.elements[0] * vec2.elements[2];
    normal.elements[2] = vec1.elements[0] * vec2.elements[1] - vec1.elements[1] * vec2.elements[0];
    normal.normalize();
    //store it in the normals array
    //console.log(normal.elements[0]+", "+normal.elements[1]+", "+normal.elements[2]);
    calculateSurfaceNormals(vec1, normal,index,false);
    //problem with the end point normal solved by taking the absolute value
    //console.log(((index+12)*3));
    normals[(index+12)*3]=(normal.elements[0]);
    normals[(index+12)*3 + 1]=(normal.elements[1]);
    normals[(index+12)*3 + 2]=(normal.elements[2]);
    //duplicate the normal for the same face
    normals[(index+36)*3]=(normal.elements[0]);
    normals[(index+36)*3 + 1]=(normal.elements[1]);
    normals[(index+36)*3 + 2]=(normal.elements[2]);

    normals[numOfVertsC-36-36-36]=(normal.elements[0]);
    normals[numOfVertsC-36-36-36 + 1]=(normal.elements[1]);
    normals[numOfVertsC-36-36-36 + 2]=(normal.elements[2]);
    //duplicate the normal for the same face
    normals[numOfVertsC-36]=(normal.elements[0]);
    normals[numOfVertsC-36 + 1]=(normal.elements[1]);
    normals[numOfVertsC-36 + 2]=(normal.elements[2]);
    numOfNormals+=4;
}
function displayNormals(){
  if(displayN){
    displayN=false;
  }else{
    displayN=true;
  }
  bufferHandling();
}
function calculateLighting(){
  //works for the irst cylyinder but not the following
  var d=1;
  var p=numOfVertsC-144;//calculates for the last cyl only
  for(i=p;i<numOfVertsC;i+=3){
    var temp=new Vector3();
    temp.elements[0] = normals[i];
    temp.elements[1] = normals[i+1];
    temp.elements[2] = normals[i+2];

    temp=temp.normalize();

    var normalL= new Vector3();
    normalL.elements[0]=lightDirection.elements[0];
    normalL.elements[1]=lightDirection.elements[1];
    normalL.elements[2]=lightDirection.elements[2];
    normalL.normalize();

    var globalPosNorm=new Vector3();
    globalPosNorm.elements[0] = globalPos.elements[0];
    globalPosNorm.elements[1] = globalPos.elements[1];
    globalPosNorm.elements[2] = globalPos.elements[2];
    globalPosNorm=globalPosNorm.normalize();

    var diffuse = new Vector3();
    var spec=new Vector3();

    //if directional
    if(directionalLightBool){
      diffuse=dirDiffuse(diffuse,temp,normalL);
      spec=dirSpec(spec,temp,globalPosNorm);
    }

    //if point
    var spec2=new Vector3([0,0,0]);
    if(pointLight){
      diffuse=pointDiffuse(diffuse,temp);
      spec2=pointSpec(spec2,temp,globalPosNorm);
      //do the point light calculations
    }

    if(specToggle){
      var finalColor=new Vector3([0,0,0]);
      finalColor.elements[0] = diffuse.elements[0];
      finalColor.elements[1] = (spec.elements[1] + spec2.elements[1])>1?1:(spec.elements[1] +spec2.elements[1]);
      finalColor.elements[2] = .2;//ambient

      colors[i] =   finalColor.elements[0];
      colors[i+1] = finalColor.elements[1];
      colors[i+2] = finalColor.elements[2];

    }else{
      colors[i] =   diffuse.elements[0]
      colors[i+1] = diffuse.elements[1]
      colors[i+2] = diffuse.elements[2] + .2;
    }
    //add a final .2 to the blue for ambient lskjdgkfh

    //numberOfColors+=3;
  }
}
function dirSpec(spec,temp,globalPosNorm){
  var halfwayNormal=halfwayVector(globalPosNorm,lightDirection);
  var light=vector3Multiply(specularColor,lightColor);
  var nDotH=dotProduct(temp,halfwayNormal);

  if(nDotH<0){
    nDotH=0;
    //console.log(nDotH);
  }
  spec.elements[0] = light.elements[0] * Math.pow(nDotH,gloss);
  spec.elements[1] = light.elements[1] * Math.pow(nDotH,gloss);
  spec.elements[2] = light.elements[2] * Math.pow(nDotH,gloss);
  return spec;
}
function dirDiffuse(diffuse,temp,normalL){
  var nDotL = temp.elements[0] * normalL.elements[0] + 
              temp.elements[1] * normalL.elements[1] + 
              temp.elements[2] * normalL.elements[2];
  if(nDotL<0){
    nDotL=0;
  }
  nDotL=nDotL;

  //take the cross product?
  diffuse.elements[0] = lightColor.elements[0] * color.elements[0];
  diffuse.elements[1] = lightColor.elements[1] * color.elements[1];
  diffuse.elements[2] = lightColor.elements[2] * color.elements[2];
  //then multiply by the nDotL
  diffuse.elements[0] = diffuse.elements[0] * nDotL;
  diffuse.elements[1] = diffuse.elements[1] * nDotL;
  diffuse.elements[2] = diffuse.elements[2] * nDotL;
  return diffuse;
}
function pointSpec(spec,temp,globalPosNorm){
  var normalizedPointDirection =new Vector3();
  normalizedPointDirection.elements[0] = secondLightPosition.elements[0] - cVert[i];
  normalizedPointDirection.elements[1] = secondLightPosition.elements[1] - cVert[i+1];
  normalizedPointDirection.elements[2] = secondLightPosition.elements[2] - cVert[i+2];

  var halfwayNormal2=halfwayVector(globalPosNorm,normalizedPointDirection);
  var light2=vector3Multiply(specularColor,secondLightColor);
  var nDotH2=dotProduct(temp,halfwayNormal2);
  var spec2=new Vector3();

  if(nDotH2<0){
    nDotH2=0;
    //console.log(nDotH);
  }

  spec2.elements[0] = light2.elements[0] * Math.pow(nDotH2,gloss);
  spec2.elements[1] = light2.elements[1] * Math.pow(nDotH2,gloss);
  spec2.elements[2] = light2.elements[2] * Math.pow(nDotH2,gloss);
  return spec2;
}
function pointDiffuse(diffuse,temp){
  var normalizedPointDirection =new Vector3();
  normalizedPointDirection.elements[0] = secondLightPosition.elements[0] - cVert[i];
  normalizedPointDirection.elements[1] = secondLightPosition.elements[1] - cVert[i+1];
  normalizedPointDirection.elements[2] = secondLightPosition.elements[2] - cVert[i+2];
  //console.log(normalizedPointDirection);
  normalizedPointDirection=normalizedPointDirection.normalize();
  console.log(normalizedPointDirection.elements);
  //both normalized
  //comes out to 0
  var nDotSL =temp.elements[0] * normalizedPointDirection.elements[0] + 
              temp.elements[1] * normalizedPointDirection.elements[1] + 
              temp.elements[2] * normalizedPointDirection.elements[2];

  if(nDotSL<0){
    nDotSL=0;
    //console.log("test");
  }
  var col = new Vector3();
  col.elements[0] = secondLightColor.elements[0] * color.elements[0];//light * mat
  col.elements[1] = secondLightColor.elements[1] * color.elements[1];
  col.elements[2] = secondLightColor.elements[2] * color.elements[2];
  //then multiply by the nDotL
  console.log(col.elements);

  diffuse.elements[0] += col.elements[0] * nDotSL;
  diffuse.elements[1] += col.elements[1] * nDotSL;
  diffuse.elements[2] += col.elements[2] * nDotSL;
  return diffuse;
}
function toggleSpecular(){
  if(specToggle){
    specToggle=false;
    //recalc lighting
    if(!mode){
      smoothShading();
    }else{
      flatShading();
    }
  }else{
    specToggle=true;
    if(!mode){
      smoothShading();
    }else{
      flatShading();
    }  
  }
}
function dotProduct(vec1,vec2){
  var dot;
  dot=(vec1.elements[0]*vec2.elements[0])+(vec1.elements[1]*vec2.elements[1])+(vec1.elements[2]*vec2.elements[2]);
  return dot;
}
function magnitude(sumVec){
  var mag = new Vector3();
  //square every element
  mag.elements[0] = sumVec.elements[0] * sumVec.elements[0];
  mag.elements[1] = sumVec.elements[1] * sumVec.elements[1];
  mag.elements[2] = sumVec.elements[2] * sumVec.elements[2];
  var sqrt = Math.sqrt(mag.elements[0] + mag.elements[1] + mag.elements[2]);
  return sqrt;
}
function vector3Divide(vec1,scalar){
  var divisor = new Vector3();
  divisor.elements[0] = vec1.elements[0] / scalar;
  divisor.elements[1] = vec1.elements[1] / scalar;
  divisor.elements[2] = vec1.elements[2] / scalar;
  return divisor;
}
function vector3Addition(vec1,vec2){
  var sum = new Vector3();
  sum.elements[0] = vec1.elements[0] + vec2.elements[0];
  sum.elements[1] = vec1.elements[1] + vec2.elements[1];
  sum.elements[2] = vec1.elements[2] + vec2.elements[2];
  return sum;
}
function halfwayVector(vec1, light){
  var halfwayN;
  var LV=vector3Addition(light,vec1);
  var magLV=magnitude(LV);
  halfwayN=vector3Divide(LV,magLV);
  return halfwayN;
}
function vector3Multiply(vec1,vec2){
  var mag = new Vector3();
  //square every element
  mag.elements[0] = vec1.elements[0] * vec2.elements[0];
  mag.elements[1] = vec1.elements[1] * vec2.elements[1];
  mag.elements[2] = vec1.elements[2] * vec2.elements[2];
  return mag;
}

function bufferHandling(){

    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

    gl.disableVertexAttribArray(surfaceNormal_Position);
    gl.disableVertexAttribArray(directionalLight_Position);

    gl.uniform1i(boolio,1);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, lineVert, gl.STATIC_DRAW);
    //divide by 3 for xyz
    gl.disableVertexAttribArray(a_Position);
    gl.disableVertexAttribArray(a_Color);
    gl.disableVertexAttribArray(surfaceNormal_Position);

    gl.drawArrays(gl.LINE_STRIP,0,numOfVerts/3);

    gl.uniform1i(boolio,0);
    gl.enableVertexAttribArray(a_Position);  
    gl.enableVertexAttribArray(a_Color); 

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cVert, gl.STATIC_DRAW);
    if(displayN){
      gl.uniform1i(boolio,2);
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, surfaceNormals, gl.STATIC_DRAW);
      gl.disableVertexAttribArray(b_Position);
      gl.disableVertexAttribArray(a_Position);
      gl.disableVertexAttribArray(a_Color);
      gl.enableVertexAttribArray(surfaceNormal_Position);

      gl.drawArrays(gl.LINES,0,numOfSurfaceNormals/3);

      gl.disableVertexAttribArray(surfaceNormal_Position);
      gl.enableVertexAttribArray(a_Position); 
      gl.enableVertexAttribArray(b_Position); 
      gl.enableVertexAttribArray(a_Color); 
      gl.uniform1i(boolio,0);
    }

    gl.uniform1i(boolio,3);
    gl.bindBuffer(gl.ARRAY_BUFFER, directionalBuffer);
    gl.enableVertexAttribArray(directionalLight_Position);
    gl.bufferData(gl.ARRAY_BUFFER, dirVert, gl.STATIC_DRAW);
    gl.disableVertexAttribArray(b_Position);
    gl.disableVertexAttribArray(a_Position);
    gl.disableVertexAttribArray(a_Color);

    gl.uniform1i(uniformObjectIndex,1);

    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

    gl.uniform1i(uniformObjectIndex,0);
    gl.disableVertexAttribArray(directionalLight_Position);
    gl.enableVertexAttribArray(a_Position); 
    gl.enableVertexAttribArray(b_Position); 
    gl.enableVertexAttribArray(a_Color); 
    gl.uniform1i(boolio,0);



    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.disableVertexAttribArray(b_Position);
    gl.drawElements(gl.TRIANGLES,numOfIndex,gl.UNSIGNED_SHORT,0);
    gl.enableVertexAttribArray(b_Position); 

    gl.enableVertexAttribArray(a_Position); 
    gl.disableVertexAttribArray(b_Position);
    gl.disableVertexAttribArray(a_Color);

    gl.uniform1i(boolio,4);
    gl.uniform1i(uniformObjectIndex,2);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);

    gl.drawElements(gl.TRIANGLES,36,gl.UNSIGNED_BYTE,0);

    gl.uniform1i(boolio,0);
    gl.uniform1i(uniformObjectIndex,0);
    gl.disableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(b_Position); 
    gl.enableVertexAttribArray(a_Color); 

    var d=0;
    //debugPrint();
}
function debugPrint(){
  console.log("NUMBEROFVERTS: "+numOfVertsC);
  console.log("NUMBEROFINDECIES: "+numOfIndex);
  console.log("NUMBEROFNORMALS: "+numOfNormals);
  console.log("NUMBEROFCOLORS: "+numberOfColors);
}
//--------------------------------------------------------------------------------------THE PROBLEM
function normalCalculation(index, flipFlop){
    var normal=new Vector3();
    var vec1=new Vector3();
    var vec2=new Vector3();
    //subtract the elements of the the 3 verticies at index and index+13
    if(flipFlop){
      vec1.elements[0]=cVert[(index + 25)  * 3]-cVert[(index) * 3];
      vec1.elements[1]=cVert[((index + 25) * 3) + 1]-cVert[((index) * 3) + 1];
      vec1.elements[2]=cVert[((index + 25) * 3) + 2]-cVert[((index) * 3) + 2];
      //do vec2
      //store it in surfaceNormals

      vec2.elements[0]=cVert[(index+24)*3]-cVert[(index+25)*3];
      vec2.elements[1]=cVert[((index+24)*3)+1]-cVert[((index+25)*3)+1];
      vec2.elements[2]=cVert[((index+24)*3)+2]-cVert[((index+25)*3)+2];
      //do the cross product to make the normal of the first triangle
      normal.elements[0] = vec1.elements[1] * vec2.elements[2] - vec1.elements[2] * vec2.elements[1];
      normal.elements[1] = vec1.elements[2] * vec2.elements[0] - vec1.elements[0] * vec2.elements[2];
      normal.elements[2] = vec1.elements[0] * vec2.elements[1] - vec1.elements[1] * vec2.elements[0];
      normal.normalize();
      calculateSurfaceNormals(vec1,normal,index,true);

      //store it in the normals array
      //console.log(index*3);
      normals[(index)*3]=normal.elements[0];
      normals[(index)*3+1]=normal.elements[1];
      normals[(index)*3+2]=normal.elements[2];
      //duplicate the normal for the same face
      normals[(index+24)*3]=normal.elements[0];
      normals[(index+24)*3+1]=normal.elements[1];
      normals[(index+24)*3+2]=normal.elements[2];

      normals[(index+1)*3]=normal.elements[0];
      normals[(index+1)*3+1]=normal.elements[1];
      normals[(index+1)*3+2]=normal.elements[2];
      //duplicate the normal for the same face
      normals[(index+25)*3]=normal.elements[0];
      normals[(index+25)*3+1]=normal.elements[1];
      normals[(index+25)*3+2]=normal.elements[2];
      numOfNormals+=4;
    }else {
      //flop
      vec1.elements[0]=cVert[(index + 25 + 12)  * 3]-cVert[(index + 12) * 3];
      vec1.elements[1]=cVert[((index + 25 + 12) * 3) + 1]-cVert[((index + 12) * 3) + 1];
      vec1.elements[2]=cVert[((index + 25 + 12) * 3) + 2]-cVert[((index + 12) * 3) + 2];
      //do vec2
      vec2.elements[0]=cVert[(index+24 + 12)*3]-cVert[(index+25+12)*3];
      vec2.elements[1]=cVert[((index+24 + 12)*3)+1]-cVert[((index+25+12)*3)+1];
      vec2.elements[2]=cVert[((index+24 + 12)*3)+2]-cVert[((index+25+12)*3)+2];
      //do the cross product to make the normal of the first triangle
      normal.elements[0] = vec1.elements[1] * vec2.elements[2] - vec1.elements[2] * vec2.elements[1];
      normal.elements[1] = vec1.elements[2] * vec2.elements[0] - vec1.elements[0] * vec2.elements[2];
      normal.elements[2] = vec1.elements[0] * vec2.elements[1] - vec1.elements[1] * vec2.elements[0];
      normal.normalize();
      calculateSurfaceNormals(vec1,normal,index,false);//fine
      //store it in the normals array
      normals[(index + 12)*3]=normal.elements[0];//all fine
      normals[(index + 12)*3+1]=normal.elements[1];
      normals[(index + 12)*3+2]=normal.elements[2];
      //duplicate the normal for the same face
      normals[(index+24 + 12)*3]=normal.elements[0];
      normals[(index+24 + 12)*3+1]=normal.elements[1];
      normals[(index+24 + 12)*3+2]=normal.elements[2];

      normals[(index + 12 +1)*3]=normal.elements[0];
      normals[(index + 12 +1)*3+1]=normal.elements[1];
      normals[(index + 12 +1)*3+2]=normal.elements[2];
      //duplicate the normal for the same face
      normals[(index+24 + 12+1)*3]=normal.elements[0];
      normals[(index+24 + 12+1)*3+1]=normal.elements[1];
      normals[(index+24 + 12+1)*3+2]=normal.elements[2];
      numOfNormals+=4;
    }


}
//---------------------------------------------------------------------------------------------------------THE PROBLEM
function calculateSurfaceNormals(vec1,normal,index,flipFlop){
  if(flipFlop){
      surfaceNormals[numOfSurfaceNormals]=vec1.elements[0]/2 + cVert[(index) * 3];
      surfaceNormals[numOfSurfaceNormals+1]=vec1.elements[1]/2 + cVert[((index) * 3) + 1];
      surfaceNormals[numOfSurfaceNormals+2]=vec1.elements[2]/2 + cVert[((index) * 3) + 2];
      numOfSurfaceNormals+=3;

      surfaceNormals[numOfSurfaceNormals]=vec1.elements[0]/2 + cVert[(index) * 3] + normal.elements[0] * .1;
      surfaceNormals[numOfSurfaceNormals+1]=vec1.elements[1]/2 + cVert[((index) * 3) + 1] + normal.elements[1] * .1;
      surfaceNormals[numOfSurfaceNormals+2]=vec1.elements[2]/2 + cVert[((index) * 3) + 2] + normal.elements[2] * .1;
      numOfSurfaceNormals+=3;
      //console.log(normal.elements[0]+", "+normal.elements[1]+", "+normal.elements[2]);
  }else{
      surfaceNormals[numOfSurfaceNormals]=vec1.elements[0]/2 + cVert[(index+12) * 3];
      surfaceNormals[numOfSurfaceNormals+1]=vec1.elements[1]/2 + cVert[((index+12) * 3) + 1];
      surfaceNormals[numOfSurfaceNormals+2]=vec1.elements[2]/2 + cVert[((index+12) * 3) + 2];
      numOfSurfaceNormals+=3;

      surfaceNormals[numOfSurfaceNormals]=vec1.elements[0]/2 + cVert[(index+12) * 3] + normal.elements[0] * .1;
      surfaceNormals[numOfSurfaceNormals+1]=vec1.elements[1]/2 + cVert[((index+12) * 3) + 1] + normal.elements[1] * .1;
      surfaceNormals[numOfSurfaceNormals+2]=vec1.elements[2]/2 + cVert[((index+12) * 3) + 2] + normal.elements[2] * .1;
      numOfSurfaceNormals+=3;
     // console.log(vec1.elements[0]+", "+vec1.elements[1]+", "+vec1.elements[2]);
  }

}
function hover(ev,gl,canvas,a_Position){
  if(enableMove){
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect() ;

    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
    if(numOfVerts>0){
      //moves the position of the last placed verticy
      lineVert[numOfVerts-3]=x;
      lineVert[numOfVerts-2]=y;
      lineVert[numOfVerts-1]=0;
      
      bufferHandling();
    }
  }
}
var colorIndex=0;
function newColor(){
  colorIndex++;
  if(colorIndex>2){
    colorIndex=0;
  }
  if(colorIndex==0){
    color=new Vector3([1,0,0]);
  }else if(colorIndex==1){
    color=new Vector3([0,1,0]);
  }else{
    color=new Vector3([0,0,1]);
  }
  loading();
  //calculateLighting();
  bufferHandling();
}
function changeBackground(){
  gl.clearColor(Math.floor(Math.random()*100)/100,
         Math.floor(Math.random()*100)/100,
         Math.floor(Math.random()*100)/100,
         Math.floor(Math.random()*100)/100);
  bufferHandling();
}
function click(ev, gl, canvas, a_Position) {
  var x = ev.clientX;
  var y = ev.clientY; 
  var rect = ev.target.getBoundingClientRect() ;
  //0 is left
  //2 is right
  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
  if(enableMove){
    if(ev.button==0){
      var z=0;
      numOfVerts+=3;
      lineVert[numOfVerts-3]=x;
      lineVert[numOfVerts-2]=y;
      lineVert[numOfVerts-1]=z
      if(numOfVerts>3){
         drawCircle(gl);
      }
      numOfVerts+=3;
      lineVert[numOfVerts-3]=x;
      lineVert[numOfVerts-2]=y;
      lineVert[numOfVerts-1]=z
    }else if(ev.button==2){
      enableMove=false;
      numOfVerts+=3;
      lineVert[numOfVerts-3]=x;
      lineVert[numOfVerts-2]=y;
      lineVert[numOfVerts-1]=z;
      drawCircle(gl);
    }
    if(mode==true){
      flatShading();
      //adds another vertex at the same spot but doesnt use it for circle calc for rubberbanding
    }else{
      smoothShading();
    }
  }else{
    //check if you clicked the object
    checkObject(ev);
  }
}
function checkObject(ev){
  var x = ev.clientX, y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  var x_in_canvas = x - rect.left
  var y_in_canvas = rect.bottom - y;
  var picked=false;
  //x and y are the mouse positions
  //set the bool to red
  gl.uniform1i(clicked,0);//sets clicked in the shader
  bufferHandling();
  //draw it to the screen
  var pixels = new Uint8Array(4); // Array for storing the pixel value
  gl.readPixels(x_in_canvas, y_in_canvas, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  for(var p=0;p<4;p++){
    console.log(pixels[p]);
  }
  if (pixels[0] == 255){//checks if the pixel is red where you clicked//also checks the transparency as a key for which object is selected
    if(pixels[3]==255){
        //picked = true;
        alert('OBJECT SELECTED');
    }else if(pixels[3]==252){
      console.log("shit actually works");
      if(directionalLightBool){
        directionalLightBool=false;
        gl.uniform1i(directionalBool,0);
        //recalculate lighting
      }else{
        directionalLightBool=true;
        gl.uniform1i(directionalBool,1);
        //recalculate lighting
      }
      //recalc lighting
      if(!mode){
        smoothShading();
      }else{
        flatShading();
      }
    }else if(pixels[3]==250){
      console.log("shit actually works");
      if(pointLight){
        pointLight=false;
        gl.uniform1i(pointBool,0);
        //recalculate lighting
      }else{
        pointLight=true;
        gl.uniform1i(pointBool,1);
        //recalculate lighting
      }
      //recalc lighting
      if(!mode){
        smoothShading();
      }else{
        flatShading();
      }
    } 
  }else{
    console.log("not there");
  }

  gl.uniform1i(clicked, 1);  // Pass false to u_Clicked(rewrite the cube)
  bufferHandling();
  //redraw to the sceen
}
function flatShading(){
  loading();
  bufferHandling();
}

function smoothCriminal(startPointIndex){
  //first circle
  //0-36-72
  for(i=startPointIndex;i<startPointIndex+36;i+=3){
    var avgNormal = new Vector3([0,0,0]);

    avgNormal.elements[0] = (normals[i    ] + normals[i + 36    ]) / 2;
    avgNormal.elements[1] = (normals[i + 1] + normals[i + 36 + 1]) / 2;
    avgNormal.elements[2] = (normals[i + 2] + normals[i + 36 + 2]) / 2;
    //console.log();

    normals[i    ] = avgNormal.elements[0];
    normals[i + 1] = avgNormal.elements[1];
    normals[i + 2] = avgNormal.elements[2];
    //duplicate
    normals[i + 36    ] = avgNormal.elements[0];
    normals[i + 36 + 1] = avgNormal.elements[1];
    normals[i + 36 + 2] = avgNormal.elements[2];
    //console.log(i+", "+(i+36));
  }
  //second circle
  //72-108-144
  for(i=startPointIndex+72;i<startPointIndex+108;i+=3){
    var avgNormal = new Vector3([0,0,0]);
    avgNormal.elements[0] = (normals[i    ] + normals[i + 36    ]) / 2;
    avgNormal.elements[1] = (normals[i + 1] + normals[i + 36 + 1]) / 2;
    avgNormal.elements[2] = (normals[i + 2] + normals[i + 36 + 2]) / 2;

    normals[i    ] = avgNormal.elements[0];
    normals[i + 1] = avgNormal.elements[1];
    normals[i + 2] = avgNormal.elements[2];
    //duplicate
    normals[i + 36    ] = avgNormal.elements[0];
    normals[i + 36 + 1] = avgNormal.elements[1];
    normals[i + 36 + 2] = avgNormal.elements[2];
    //console.log(i+", "+(i+36));
  }
  //printNormals();
}
function printNormals(){
  var index=0;
  for(i=0;i<numOfVertsC;i+=3){

    console.log("NORMALS "+(index)+": "+normals[i]+", "+normals[i+1]+", "+normals[i+2]);
    index++;
    //console.log(numOfVertsC);
  }
}
//sets it to smoothshading and changes the normals
//breaks when reloading flat then choosing smooth again
function smoothShading(){
  //first circle
  var num=numOfVertsC/144;//number of different cylinders
  var temp=numOfVertsC;//stores the value
  numOfVertsC=0;
  var n=0;
  //for loop works
  for(n;n<num;n++){
    smoothCriminal(n*144);
    //console.log((n*144));
    numOfVertsC+=144;
    calculateLighting();
  }
  numOfVertsC=temp;
  bufferHandling();
  mode=false;
}
function loading(){
    var tempIndex=numOfIndex;
    var tempVerts=numOfVertsC;
    //go through each cyl
    numOfIndex=0;
    numOfVertsC=0;
    normals=new Float32Array(5000);
    numberOfColors=0;
    numOfNormals=0;
    numOfCyl=0;
    indices=new Uint16Array(5000);
    while(numOfIndex<tempIndex){
      numOfVertsC+=72;
      if(numOfCyl>0){
          transitionTest();
      }
      numOfCyl++;
      numOfVertsC+=72;

      calculateIndicies();

      //console.log(numOfVertsC);
      //console.log(numOfIndex);
      calculateLighting();
    }
    mode=true;
}
function toggleShading(){
  if(mode==true){
    //smooth it
    smoothShading();
  }else{
    //flat it
    flatShading();
  }
}
//reads the data from the saved SOR file and fills the arrays for drawing
function readSOR(){
  var SORObj = readFile();
  //reset all the variables and arrays then load them in like this
  if(SORObj!=null){
    var numV=0;
    for(i=0;i<5000;i++){
      cVert[i]=SORObj.vertices[i];
      numV++;
    }
    var num=0;
    for(i=0;i<SORObj.indexes[4999];i++){
      indices[i]=SORObj.indexes[i];
      num++;
    }
    //gets the index and verts values from the file
    numOfIndex=SORObj.indexes[4999];
    numOfVertsC=SORObj.vertices[4998];
    loading();
    numOfVerts=3;
    bufferHandling();
  }
}
//saves the cylinder as an obj
function saveSOR(){
  indices[4999]=numOfIndex;
  //console.log(numOfVertsC);
  indices[4998]=numOfVertsC;
  var p = prompt("Please enter your file name", "temperooni");

  if (p != null) {
    document.getElementById("fileName").innerHTML =p;
  }

  saveFile(new SOR(p, cVert, indices));
}
//TODO
/*
1) fix the normal or color error that im getting
2) make it loadable
3) display normals with red lines that are toggleable with an html button
*/