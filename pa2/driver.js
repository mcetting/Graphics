// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +//arrays for each vertex
  'attribute vec4 b_Position;\n' +
  'attribute vec4 surfaceNormal_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +
  'uniform mat4 u_MvpMatrix;\n' + //element for each vertex
  'uniform int doIt;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  if(doIt==1){' +
  '      gl_Position=u_MvpMatrix*b_Position;\n' +
  '      v_Color = vec4(0,0,0,1);\n' +
  '  }else if(doIt==0){\n' +
  '      gl_Position = u_MvpMatrix * a_Position;\n' +
  '      v_Color = a_Color;\n' +
  '  }else{\n' +
  '      gl_Position=u_MvpMatrix*surfaceNormal_Position;\n' +
  '      v_Color = vec4(1,0,0,1);\n' +
  '  }\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = vec4(v_Color.rgb,1);\n' +
  '}\n';
//global lighting variables
var gloss=1;
var lightDirection = new Vector3([1,1,1]);
var specularColor = new Vector3([0,1,0])
var lightColor = new Vector3([1,1,1]);
var color = new Vector3([1,0,0]);
//array allocation
var vertices = new Float32Array(5000);
var cVert = new Float32Array(5000);
var lineVert= new Float32Array(5000);
var indices = new Uint16Array(5000);
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
var surfaceNormal_Position;
var boolio;
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
var radius=.2;
var debug=false;
var enableMove=true;
var perspectiveBool=false;
var displayN = false;
var u_MvpMatrix;
var mvpMatrix;
var slider;
var mode=true;
var angle=10;
var globalPos=new Vector3([0,0,5]);
//main function
//overright
function main() {
  document.onkeydown = function(ev){
    if(ev.keyCode==65){
      //A
      var mat=new Matrix4();
      mat.setRotate(-angle,0,1,0);
      globalPos=mat.multiplyVector3(globalPos);
      mvpMatrix.setPerspective(30,1,1,100);
      mvpMatrix.lookAt(globalPos.elements[0], globalPos.elements[1], globalPos.elements[2], 0, 0, 0, 0, 1, 0);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      smoothShading();
      bufferHandling();
    }else if(ev.keyCode==68){
      //D
      var mat=new Matrix4();
      mat.setRotate(angle,0,1,0);
      globalPos=mat.multiplyVector3(globalPos);
      mvpMatrix.setPerspective(30,1,1,100);
      mvpMatrix.lookAt(globalPos.elements[0], globalPos.elements[1], globalPos.elements[2], 0, 0, 0, 0, 1, 0);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      smoothShading();
      bufferHandling();
    }
  }




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
  setupIOSOR("fileName");
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');
  // Get the rendering context for WebGL
  gl = getWebGLContext(canvas);
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
  // Get the storage location of u_MvpMatrix
  u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) {
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }
  boolio = gl.getUniformLocation(gl.program, 'doIt');
  gl.uniform1i(boolio,0);//sets doIt in the shader

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
  
  if(!debug){
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
    console.log(numOfNormals);
    //debugPrint();
  }
}
function transitionTest(){
  var index = numOfVertsC/3 - 48;
  console.log("GIMME MY INDEX: "+index);
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
    console.log("GIMME MY INDEX: "+index);
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
    console.log("index: "+index+" numOfVertsC: "+numOfVertsC);
    //do the cross product to make the normal of the first triangle
    normal.elements[0] = vec1.elements[1] * vec2.elements[2] - vec1.elements[2] * vec2.elements[1];
    normal.elements[1] = vec1.elements[2] * vec2.elements[0] - vec1.elements[0] * vec2.elements[2];
    normal.elements[2] = vec1.elements[0] * vec2.elements[1] - vec1.elements[1] * vec2.elements[0];
    normal.normalize();
    //store it in the normals array
    console.log(normal.elements[0]+", "+normal.elements[1]+", "+normal.elements[2]);
    calculateSurfaceNormals(vec1, normal,index,false);
    //problem with the end point normal solved by taking the absolute value
    console.log(((index+12)*3));
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
      var nDotL = temp.elements[0] * lightDirection.elements[0] + 
                  temp.elements[1] * lightDirection.elements[1] + 
                  temp.elements[2] * lightDirection.elements[2];
      if(nDotL<0){
        nDotL=0;
      }
      nDotL=nDotL;
      //calculate the lighting
      var diffuse = new Vector3();
      //color=color.normalize();
     // lightColor=lightColor.normalize();
      //do the multiplication manually?
      //take the cross product?
      diffuse.elements[0] = lightColor.elements[0] * color.elements[0];
      diffuse.elements[1] = lightColor.elements[1] * color.elements[1];
      diffuse.elements[2] = lightColor.elements[2] * color.elements[2];
      //then multiply by the nDotL
      diffuse.elements[0] = diffuse.elements[0] * nDotL;
      diffuse.elements[1] = diffuse.elements[1] * nDotL;
      diffuse.elements[2] = diffuse.elements[2] * nDotL;
      //diffuse.elements=lightColor.elements * color.elements * nDotL;
      d++;
      //specular
      var halfwayNormal=halfwayVector();
      var light=vector3Multiply(specularColor,lightColor);
      var nDotH=dotProduct(temp,halfwayNormal);
      var spec=new Vector3();
      if(nDotH<0){
        nDotH=0;
        //console.log(nDotH);
      }

      spec.elements[0] = light.elements[0] * Math.pow(nDotH,gloss);
      spec.elements[1] = light.elements[1] * Math.pow(nDotH,gloss);
      spec.elements[2] = light.elements[2] * Math.pow(nDotH,gloss);
      //add a final .2 to the blue for ambient lskjdgkfh
      var finalColor=new Vector3([0,0,0]);
      finalColor.elements[0] = diffuse.elements[0];
      finalColor.elements[1] = spec.elements[1];
      finalColor.elements[2] = .2;
      //somehow pass this into the shader?
      //diffuse = new Vector3([0,0,0]);
      colors[i] =   finalColor.elements[0];
      colors[i+1] = finalColor.elements[1];
      colors[i+2] = finalColor.elements[2];
      numberOfColors+=3;
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
function halfwayVector(){
  var halfwayN;
  var LV=vector3Addition(lightDirection,globalPos);
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

    gl.enable(gl.DEPTH_TEST);
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
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.disableVertexAttribArray(b_Position);
    gl.drawElements(gl.TRIANGLES,numOfIndex,gl.UNSIGNED_SHORT,0);
    gl.enableVertexAttribArray(b_Position); 

    var d=0;
    debugPrint();
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
      console.log(index*3);
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
      
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

      gl.disableVertexAttribArray(surfaceNormal_Position);



      gl.uniform1i(boolio,1);
      gl.bindBuffer(gl.ARRAY_BUFFER,lineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,lineVert,gl.STATIC_DRAW);
      gl.disableVertexAttribArray(a_Position);
      gl.disableVertexAttribArray(a_Color);
      
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

        gl.disableVertexAttribArray(a_Position);
        gl.disableVertexAttribArray(a_Color);
        gl.enableVertexAttribArray(surfaceNormal_Position);

        gl.drawArrays(gl.LINES,0,numOfSurfaceNormals/3);

        gl.disableVertexAttribArray(surfaceNormal_Position);
        gl.enableVertexAttribArray(a_Position);  
        gl.enableVertexAttribArray(a_Color); 
        gl.uniform1i(boolio,0);
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

      gl.disableVertexAttribArray(b_Position);
      gl.drawElements(gl.TRIANGLES,numOfIndex,gl.UNSIGNED_SHORT,0);
      gl.enableVertexAttribArray(b_Position); 
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
  if(enableMove){
    var x = ev.clientX;
    var y = ev.clientY; 
    var rect = ev.target.getBoundingClientRect() ;
    //0 is left
    //2 is right
    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
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
      //adds another vertex at the same spot but doesnt use it for circle calc for rubberbanding
  }
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
          calculateIndicies();
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