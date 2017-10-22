// HelloCube.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 b_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform bool doIt;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  if(doIt){' +
  '      gl_Position=u_MvpMatrix*b_Position;\n' +
  '  }else{\n' +
  '      gl_Position = u_MvpMatrix * a_Position;\n' +
  '  }\n' +
  '  v_Color = a_Color;\n' +
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
//global variables
var b_Position;
var boolio;
var lightDirection = new Vector3([1,1,1]);
var lightColor = new Vector3([1,1,1]);
var a_Position;
var a_Color;
var enableMove=true;
var numOfVerts=0;
var numOfVertsC=0;
var vertices = new Float32Array(5000);
var cVert = new Float32Array(5000);
var lineVert= new Float32Array(5000);
var indices = new Uint16Array(5000);
var normals = new Float32Array(5000);
var colors = new Float32Array(5000);
var numOfNormals=0;
var vertexBuffer;
var indexBuffer;
var lineBuffer;
var colorBuffer;
var numOfIndex=0;
var numOfCyl=0;
var numberOfColors=0;
var gl;
var radius=.1;
var debug=false;
function main() {
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
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) {
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }
  boolio = gl.getUniformLocation(gl.program, 'doIt');
  gl.uniform1i(boolio,0);//sets doIt in the shader

  gl.clearColor(.9, .9, .9, 1.0);
  gl.enable(gl.DEPTH_TEST);
  // Set the eye point and the viewing volume
  
  var mvpMatrix = new Matrix4();
  // mvpMatrix.setPerspective(30, 1, 1, 100);
  mvpMatrix.setOrtho(-1, 1,-1, 1,-1, 1);
  //mvpMatrix.lookAt(0, 0, 5, 0, 0, 0, 0, 1, 0);
  
  // Pass the model view projection matrix to u_MvpMatrix
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  // Clear color and depth buffer
  canvas.onmousedown = function(ev){ click(ev, gl, canvas, a_Position); };
  canvas.onmousemove=function(ev){hover(ev,gl,canvas,a_Position);};
}
//indices form triangles
function initVertexBuffers(gl) {
  //creates all 3 used buffers for drawing
  vertexBuffer = gl.createBuffer();
  indexBuffer = gl.createBuffer();
  lineBuffer = gl.createBuffer();
  colorBuffer = gl.createBuffer();

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
    if(numOfCyl>0){
      //duplicate the last circle twice
    }
    //gets the initial points from the lineVerts that arnt printed to the screen
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
    
    var pVec=new Vector3([0,0,radius]);
    cVert[numOfVertsC]=frontPoint.x;
    cVert[numOfVertsC+1]=frontPoint.y;
    cVert[numOfVertsC+2]=radius;
    numOfVertsC+=3;

    var num=0;
    var amountOfV=numOfVertsC;
    for (var i = 0; i <= 10; i++) {
      pVec=rotMatrix.multiplyVector3(pVec);
      num=amountOfV+i*3;
      cVert[num]=frontPoint.x+pVec.elements[0];
      cVert[num+1]=frontPoint.y+pVec.elements[1];
      cVert[num+2]=pVec.elements[2];
      numOfVertsC+=3;
    }
    if(numOfVertsC>700000000){
        duplicateVerts(rotMatrix,frontPoint);
        duplicateVerts(rotMatrix,frontPoint);
        duplicateVerts(rotMatrix,frontPoint);
    }else{
        duplicateVerts(rotMatrix,frontPoint);
    }

    //-------------------------
    if(numOfCyl>0){
      var index = numOfVertsC/3 - 48;
      var p = numOfIndex;
      var flipFlop=false;
      for(i=0;i<66;i+=6){
        if(!flipFlop){
          //triangle 1
          indices[i+p] =   index;
          indices[i+p+1] = index + 24 + 1;
          indices[i+p+2] = index + 24;
          //calculate the normal
          normalCalculation(index,true);
          //triangle 2
          indices[i+p+3] = index;
          indices[i+p+4] = index + 1;
          indices[i+p+5] = index + 24 + 1;
        }else{
          //triangle 1
          indices[i+p] =   index + 12;
          indices[i+p+1] = index + 24 + 1 + 12;
          indices[i+p+2] = index + 24 + 12;
          //calculate the normal
          normalCalculation(index, false);
          //triangle 2
          indices[i+p+3] = index + 12;
          indices[i+p+4] = index + 1 + 12;
          indices[i+p+5] = index + 13 + 12;
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
      numOfNormals+=33;
  
    //connect the last one
    indices[i+p] =   index+12;
    indices[i+p+1] = numOfVertsC/3 - 12;
    indices[i+p+2] = index+36;

    var normal=new Vector3();
    var vec1=new Vector3();
    var vec2=new Vector3();
    console.log("FOR UR HONOR");
    vec1.elements[0]=cVert[numOfVertsC/3-12]-cVert[(index+12)*3];
    vec1.elements[1]=cVert[(numOfVertsC/3-12)+1]-cVert[((index+12)*3)+1];
    vec1.elements[2]=cVert[(numOfVertsC/3-12)+2]-cVert[((index+12)*3)+2];
    console.log("tasty");
    console.log(numOfVertsC/3-12);
    console.log((index+12)*3);
    console.log((index+36)*3);
    //do vec2
    vec2.elements[0]=cVert[(index+36)*3]-cVert[(numOfVertsC/3-12)];
    vec2.elements[1]=cVert[((index+36)*3)+1]-cVert[numOfVertsC/3-12+1];
    vec2.elements[2]=cVert[((index+36)*3)+2]-cVert[numOfVertsC/3-12+2];
    //do the cross product to make the normal of the first triangle
    normal.elements[0] = vec1.elements[1] * vec2.elements[2] - vec1.elements[2] * vec2.elements[1];
    normal.elements[1] = vec1.elements[2] * vec2.elements[0] - vec1.elements[0] * vec2.elements[2];
    normal.elements[2] = vec1.elements[0] * vec2.elements[1] - vec1.elements[1] * vec2.elements[0];
    //store it in the normals array
    normals[(index+12)*3]=normal.elements[0];
    normals[(index+12)*3+1]=normal.elements[1];
    normals[(index+12)*3+2]=normal.elements[2];
    //duplicate the normal for the same face
    normals[(index+36)*3]=normal.elements[0];
    normals[(index+36)*3+1]=normal.elements[1];
    normals[(index+36)*3+2]=normal.elements[2];

    normals[numOfVertsC-36-36-36]=normal.elements[0];
    normals[numOfVertsC-36-36-36]=normal.elements[1];
    normals[numOfVertsC-36-36-36]=normal.elements[2];
    //duplicate the normal for the same face
    normals[numOfVertsC-36]=normal.elements[0];
    normals[numOfVertsC-36]=normal.elements[1];
    normals[numOfVertsC-36]=normal.elements[2];

    //subtract the elements of the the 3 verticies at index and index+13
    indices[i+p+3] = index+12;
    indices[i+p+4] = numOfVertsC/3 - 36;//48-48=0+12=12->0
    indices[i+p+5] = numOfVertsC/3 - 12;//24

    numOfIndex+=6;
    }
    //-------------------------

    pVec=new Vector3([0,0,radius]);
    cVert[numOfVertsC]=backPoint.x;
    cVert[numOfVertsC+1]=backPoint.y;
    cVert[numOfVertsC+2]=radius;
    numOfVertsC+=3;

    var num = 0;
    var amountOfV = numOfVertsC;
    for (var i = 0; i <= 10; i++) {
      pVec = rotMatrix.multiplyVector3(pVec);
      num =  amountOfV+i*3;
      cVert[num] =   backPoint.x+pVec.elements[0];
      cVert[num+1] = backPoint.y+pVec.elements[1];
      cVert[num+2] = pVec.elements[2];
      numOfVertsC+=3;
    }
    duplicateVerts(rotMatrix,backPoint);
    //duplicateVerts(rotMatrix,backPoint);
    //duplicateVerts(rotMatrix,backPoint);
    //-------------------------
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
        normalCalculation(index,true);
        //triangle 2
        indices[i+p+3] = index;
        indices[i+p+4] = index + 1;
        indices[i+p+5] = index + 24 + 1;
      }else{
        //triangle 1
        indices[i+p] =   index + 12;
        indices[i+p+1] = index + 24 + 1 + 12;
        indices[i+p+2] = index + 24 + 12;
        //calculate the normal
        normalCalculation(index, false);
        //triangle 2
        indices[i+p+3] = index + 12;
        indices[i+p+4] = index + 1 + 12;
        indices[i+p+5] = index + 24 + 1 + 12;
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
    console.log("FLIPFLOP: "+flipFlop);
    //find the normal for the last part of the cy;inder
    //----------------------------------------------
    //TOTO THIS PLZ
    //----------------------------------------------
    //connect the last one
    indices[i+p] =   index+12;
    indices[i+p+1] = numOfVertsC/3 - 12;
    indices[i+p+2] = index+36;
    var normal=new Vector3();
    var vec1=new Vector3();
    var vec2=new Vector3();
  
    vec1.elements[0]=cVert[numOfVertsC/3-12]-cVert[(index+12)*3];
    vec1.elements[1]=cVert[(numOfVertsC/3-12)+1]-cVert[((index+12)*3)+1];
    vec1.elements[2]=cVert[(numOfVertsC/3-12)+2]-cVert[((index+12)*3)+2];
    //do vec2
    vec2.elements[0]=cVert[(index+36)*3]-cVert[(numOfVertsC/3-12)];
    vec2.elements[1]=cVert[((index+36)*3)+1]-cVert[numOfVertsC/3-12+1];
    vec2.elements[2]=cVert[((index+36)*3)+2]-cVert[numOfVertsC/3-12+2];
    //do the cross product to make the normal of the first triangle
    normal.elements[0] = vec1.elements[1] * vec2.elements[2] - vec1.elements[2] * vec2.elements[1];
    normal.elements[1] = vec1.elements[2] * vec2.elements[0] - vec1.elements[0] * vec2.elements[2];
    normal.elements[2] = vec1.elements[0] * vec2.elements[1] - vec1.elements[1] * vec2.elements[0];
    //store it in the normals array
    normals[(index+12)*3]=normal.elements[0];
    normals[(index+12)*3+1]=normal.elements[1];
    normals[(index+12)*3+2]=normal.elements[2];
    //duplicate the normal for the same face
    normals[(index+36)*3]=normal.elements[0];
    normals[(index+36)*3+1]=normal.elements[1];
    normals[(index+36)*3+2]=normal.elements[2];

    normals[numOfVertsC-36-36-36]=normal.elements[0];
    normals[numOfVertsC-36-36-36]=normal.elements[1];
    normals[numOfVertsC-36-36-36]=normal.elements[2];
    //duplicate the normal for the same face
    normals[numOfVertsC-36]=normal.elements[0];
    normals[numOfVertsC-36]=normal.elements[1];
    normals[numOfVertsC-36]=normal.elements[2];

    //subtract the elements of the the 3 verticies at index and index+13
    indices[i+p+3] = index+12;
    indices[i+p+4] = numOfVertsC/3 - 36;//48-48=0+12=12->0
    indices[i+p+5] = numOfVertsC/3 - 12;//24

    numOfIndex+=6;
    numOfCyl++;
    //-------------------------------------
    //light shit
    //works for the irst cylyinder but not the following
    var d=1;
    var p=numOfVertsC-144;
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
      var color =   new Vector3([0,1,0]);
      //color=color.normalize();
      lightColor=lightColor.normalize();
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
      //somehow pass this into the shader?
      //diffuse = new Vector3([0,0,0]);
      colors[i] =   diffuse.elements[0];
      colors[i+1] = diffuse.elements[1];
      colors[i+2] = diffuse.elements[2];
      numberOfColors+=3;
    }
    //-------------------------------------

    //make another circle on the other side
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

    gl.uniform1i(boolio,1);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, lineVert, gl.STATIC_DRAW);
    //divide by 3 for xyz
    gl.disableVertexAttribArray(a_Position);
    gl.disableVertexAttribArray(a_Color);
    gl.drawArrays(gl.LINE_STRIP,0,numOfVerts/3);
    gl.uniform1i(boolio,0);
    gl.enableVertexAttribArray(a_Position);  
    gl.enableVertexAttribArray(a_Color);  
gl.enable(gl.DEPTH_TEST);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cVert, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.disableVertexAttribArray(b_Position);
    gl.drawElements(gl.TRIANGLES,numOfIndex,gl.UNSIGNED_SHORT,0);
    gl.enableVertexAttribArray(b_Position); 
    console.log("VERTEX#: "+numOfVertsC+", "+"NORMAL#: "+numOfNormals);
    console.log("Color#: "+numberOfColors);
    for (var i = 0; i < numOfVertsC/2; i++) {
      if(i%3==0){
        console.log("---------------------");
      }
      console.log("indices: "+indices[i]);
    }
    console.log("INDEX AT THIS POITN: "+index);
    console.log("number of elements "+numOfVertsC);
    console.log("NUMBEROF INDEXD: "+numOfIndex);

    var d=0;
    
  }
}
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
      vec2.elements[0]=cVert[(index+24)*3]-cVert[(index+25)*3];
      vec2.elements[1]=cVert[((index+24)*3)+1]-cVert[((index+25)*3)+1];
      vec2.elements[2]=cVert[((index+24)*3)+2]-cVert[((index+25)*3)+2];
      //do the cross product to make the normal of the first triangle
      normal.elements[0] = vec1.elements[1] * vec2.elements[2] - vec1.elements[2] * vec2.elements[1];
      normal.elements[1] = vec1.elements[2] * vec2.elements[0] - vec1.elements[0] * vec2.elements[2];
      normal.elements[2] = vec1.elements[0] * vec2.elements[1] - vec1.elements[1] * vec2.elements[0];
      //store it in the normals array
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
      //store it in the normals array
      normals[(index + 12)*3]=normal.elements[0];
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
function click(ev, gl, canvas, a_Position) {
  gl.clearColor(Math.floor(Math.random()*100)/100,
         Math.floor(Math.random()*100)/100,
         Math.floor(Math.random()*100)/100,
         Math.floor(Math.random()*100)/100);
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
    }else if(ev.button==2){
      enableMove=false;
    }
      numOfVerts+=3;
      lineVert[numOfVerts-3]=x;
      lineVert[numOfVerts-2]=y;
      lineVert[numOfVerts-1]=z
      //adds another vertex at the same spot but doesnt use it for circle calc for rubberbanding
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
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cVert, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.LINES,num,gl.UNSIGNED_SHORT,0);
    
  }
}
//saves the cylinder as an obj
function saveSOR(){
  indices[4999]=numOfIndex;
  var p = prompt("Please enter your file name", "temperooni");

  if (p != null) {
    document.getElementById("fileName").innerHTML =p;
  }

  saveFile(new SOR(p, cVert, indices));
}

/*
TODO - List
----------------------------------------------------------
1) reimplement rubber-banding from lab 1 and print the line verticies to to the screen
2) do the actual lab
----------------------------------------------------------
*/