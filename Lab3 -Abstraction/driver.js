/**********************************************VERTEX_SHADER**********************************************/
//the shader used for controlling the verticies and vert color
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
        gl_Position = u_MvpMatrix * b_Position;
        v_Color = vec4(0,0,0,1);
    }else if(doIt==0){
        gl_Position = u_MvpMatrix * a_Position;
        if(clicked){
           v_Color = a_Color;
        }else{
           v_Color = vec4(1,0,0,255);
        }
    }else if(doIt==2){
        gl_Position = u_MvpMatrix * surfaceNormal_Position;
        v_Color = vec4(1,0,0,1);
    }else if(doIt==3){
      //if3
      gl_Position = u_MvpMatrix * directionalLight_Position;
      if(directional){
        if(clicked){
          v_Color = vec4(1,0,0,1);
        }else{
          v_Color = vec4(1,0,0,255);
        }

      }else{
        if(clicked){
           v_Color = vec4(.4,.4,.4,1);
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
/**********************************************FRAGMENT_SHADER**********************************************/
//handles fragments and screen color
var FSHADER_SOURCE = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  uniform int objectIndex;
  uniform float alpha;
  varying vec4 v_Color;
  void main() {
    if(objectIndex==0){
        gl_FragColor = vec4(v_Color.rgb, alpha);
    }else if(objectIndex==1){
        gl_FragColor = vec4(v_Color.rgb,.60);
    }else if(objectIndex==2){
        gl_FragColor = vec4(v_Color.rgb,.50);
    }
  }`;
//mesh object
var MeshObject = function(arraySize){
  /**********************************************VARIABLES**********************************************/
  this.isMostRecent = false;
  //iterators
  this.numOfIndex          = 0;//number of indicies
  this.numOfCyl            = 0;//number of cylinders
  this.numberOfColors      = 0;//number of colors
  this.numOfVertsC         = 0;//number of verticies
  this.numOfSurfaceNormals = 0;//number of surface normals
  this.numOfNormals        = 0;//number of normals

  this.alphaKey;
  this.origin = new Vector3();
  //multiply the verticies after transformations by the model matrix
  //multiply the normals after transformations by the normal matrix
  //multiply the u_mvpMatrix by the model matrix to display the transformations
  this.modelMatrix     = new Matrix4();//the model matrix for the object
  this.normalMatrix    = new Matrix4();//the normal matrix for the object

  this.translateMatrix = new Matrix4();
  this.rotationMatrix  = new Matrix4();
  this.scaleMatrix     = new Matrix4();
  //important for mesh
  this.vertices       = new Float32Array(arraySize);//the place where the object verts are stored
  this.indices        = new Uint16Array(arraySize); //the place where the object indicies are stored
  this.normals        = new Float32Array(arraySize);//the place where the object normals are stored
  this.colors         = new Float32Array(arraySize);//the place where the calculated colors are stored
  this.surfaceNormals = new Float32Array(arraySize);//the place where the surface normals are stored

  /**********************************************FUNCTIONS**********************************************/
  //this is where everything begins being calculated and stored in the object
  this.drawCylinder = function drawCylinder(gl){
    var frontPoint = {
      x:lineVert[numOfVerts - 9],
      y:lineVert[numOfVerts - 8]
    }
    var backPoint = {
      x:lineVert[numOfVerts - 6],
      y:lineVert[numOfVerts - 5]
    }

    var rotMatrix = new Matrix4();
    var rot = new Vector3([backPoint.x - frontPoint.x,backPoint.y - frontPoint.y, 0]);
    rot = rot.normalize();
    rotMatrix.setRotate(30, rot.elements[0], rot.elements[1], rot.elements[2]);

    this.circleVerts(rotMatrix, frontPoint);
    this.circleVerts(rotMatrix, frontPoint);

    if(this.numOfCyl>0){
      this.transitionHandling();
    }

    this.circleVerts(rotMatrix, backPoint);
    this.circleVerts(rotMatrix, backPoint);

    this.calculateIndicies();
    this.calculateLighting();

    allBuffers();
    //this.printData();
  }
  //debug function for checking proper numbers
  this.printData = function printData(){
    console.log("Verts: "          + this.numOfVertsC);
    console.log("indices: "        + this.numOfIndex);
    console.log("numberOfColors: " + this.numberOfColors);
    console.log("Normals: "        + this.numOfNormals);
  }
  //creates a set of circle verticies
  this.circleVerts = function circleVerts(rotMatrix, point){
    var pVec = new Vector3([0,0,radius]);

    this.vertices[this.numOfVertsC    ] = point.x;
    this.vertices[this.numOfVertsC + 1] = point.y;
    this.vertices[this.numOfVertsC + 2] = radius;
    this.numOfVertsC +=3;

    var num = 0;
    var amountOfV = this.numOfVertsC;
    for (var i = 0; i <= 10; i++) {
      pVec = rotMatrix.multiplyVector3(pVec);
      num  = amountOfV + i * 3;
      this.vertices[num    ] = point.x + pVec.elements[0];
      this.vertices[num + 1] = point.y + pVec.elements[1];
      this.vertices[num + 2] = pVec.elements[2];
      this.numOfVertsC+=3;
    }
  }
  /**********************************************INDICIES**********************************************/
  //calculates the indicies and normals for the transition
  this.transitionHandling = function transitionHandling(){
    var index    = this.numOfVertsC / 3 - 48;
    var p        = this.numOfIndex;
    var flipFlop = false;

    for(var i=0;i<66;i+=6){
      if(!flipFlop){
        this.indices[i + p    ] = index;
        this.indices[i + p + 1] = index + 24 + 1;
        this.indices[i + p + 2] = index + 24;

        this.indices[i + p + 3] = index;
        this.indices[i + p + 4] = index + 1;
        this.indices[i + p + 5] = index + 24 + 1;
      }else{
        this.indices[i + p    ] = index + 12;
        this.indices[i + p + 1] = index + 24 + 1 + 12;
        this.indices[i + p + 2] = index + 24 + 12;

        this.indices[i + p + 3] = index + 12;
        this.indices[i + p + 4] = index + 1 + 12;
        this.indices[i + p + 5] = index + 24 + 1 + 12;
      }

      if(flipFlop){
        flipFlop =false;
      }else{
        flipFlop = true;
      }

      index++;
      this.numOfIndex+=6;
    }
    this.indices[i + p    ] = index + 12;
    this.indices[i + p + 1] = this.numOfVertsC / 3 - 12; 
    this.indices[i + p + 2] = index + 36;
    
    this.indices[i + p + 3] = index + 12;
    this.indices[i + p + 4] = this.numOfVertsC / 3 - 36;
    this.indices[i + p + 5] = this.numOfVertsC / 3 - 12;

    this.numOfIndex +=6;
    this.numOfCyl++;
  }
  //calculates the indicies for the standard cylinder
  this.calculateIndicies = function calculateIndicies(){
    var index    = this.numOfVertsC / 3 - 48;
    var p        = this.numOfIndex;
    var flipFlop = false;

    for(var i=0;i<66;i+=6){
      if(!flipFlop){
        this.indices[i + p    ] = index;
        this.indices[i + p + 1] = index + 24 + 1;
        this.indices[i + p + 2] = index + 24;

        this.indices[i + p + 3] = index;
        this.indices[i + p + 4] = index + 1;
        this.indices[i + p + 5] = index + 24 + 1;

        this.normalCalculation(index, true);
      }else{
        this.indices[i + p    ] = index + 12;
        this.indices[i + p + 1] = index + 24 + 1 + 12;
        this.indices[i + p + 2] = index + 24 + 12;

        this.indices[i + p + 3] = index + 12;
        this.indices[i + p + 4] = index + 1 + 12;
        this.indices[i + p + 5] = index + 24 + 1 + 12;

        this.normalCalculation(index, false);
      }
      if(flipFlop){
        flipFlop =false;
      }else{
        flipFlop = true;
      }
      index++;
      this.numOfIndex+=6;
    }
    this.indices[i + p    ] = index + 12;
    this.indices[i + p + 1] = this.numOfVertsC / 3 - 12;
    this.indices[i + p + 2] = index + 36;

    this.endNormals(index);
    
    this.indices[i + p + 3] = index + 12;
    this.indices[i + p + 4] = this.numOfVertsC / 3 - 36;
    this.indices[i + p + 5] = this.numOfVertsC / 3 - 12;

    this.numOfIndex+=6;
    this.numOfCyl++;
  }
  /**********************************************NORMALS**********************************************/
  this.normalCalculation = function normalCalculation(index, flipFlop){
    var normal = new Vector3();
    var vec1   = new Vector3();
    var vec2   = new Vector3();

    if(flipFlop){
      vec1.elements[0] = this.vertices[(index + 25)  * 3     ] - this.vertices[(index) * 3      ];
      vec1.elements[1] = this.vertices[((index + 25) * 3) + 1] - this.vertices[((index) * 3) + 1];
      vec1.elements[2] = this.vertices[((index + 25) * 3) + 2] - this.vertices[((index) * 3) + 2];

      vec2.elements[0] = this.vertices[(index + 24) *3     ] - this.vertices[(index + 25) * 3      ];
      vec2.elements[1] = this.vertices[((index + 24) *3) +1] - this.vertices[((index + 25) * 3) + 1];
      vec2.elements[2] = this.vertices[((index + 24) *3) +2] - this.vertices[((index + 25) * 3) + 2];

      normal.elements[0] = vec1.elements[1] * vec2.elements[2] - vec1.elements[2] * vec2.elements[1];
      normal.elements[1] = vec1.elements[2] * vec2.elements[0] - vec1.elements[0] * vec2.elements[2];
      normal.elements[2] = vec1.elements[0] * vec2.elements[1] - vec1.elements[1] * vec2.elements[0];
      normal.normalize();

      this.calculateSurfaceNormals(vec1, normal, index, true);

      this.normals[(index) * 3    ] = normal.elements[0];
      this.normals[(index) * 3 + 1] = normal.elements[1];
      this.normals[(index) * 3 + 2] = normal.elements[2];

      this.normals[(index + 24) * 3    ] = normal.elements[0];
      this.normals[(index + 24) * 3 + 1] = normal.elements[1];
      this.normals[(index + 24) * 3 + 2] = normal.elements[2];

      this.normals[(index + 1) * 3    ] = normal.elements[0];
      this.normals[(index + 1) * 3 + 1] = normal.elements[1];
      this.normals[(index + 1) * 3 + 2] = normal.elements[2];

      this.normals[(index + 25) * 3    ] = normal.elements[0];
      this.normals[(index + 25) * 3 + 1] = normal.elements[1];
      this.normals[(index + 25) * 3 + 2] = normal.elements[2];
      this.numOfNormals+=4;
    }else {
      vec1.elements[0] = this.vertices[(index + 25 + 12)  * 3     ] - this.vertices[(index + 12) * 3      ];
      vec1.elements[1] = this.vertices[((index + 25 + 12) * 3) + 1] - this.vertices[((index + 12) * 3) + 1];
      vec1.elements[2] = this.vertices[((index + 25 + 12) * 3) + 2] - this.vertices[((index + 12) * 3) + 2];

      vec2.elements[0] = this.vertices[(index + 24 + 12) * 3      ] - this.vertices[(index + 25 + 12) * 3      ];
      vec2.elements[1] = this.vertices[((index + 24 + 12) * 3) + 1] - this.vertices[((index + 25 + 12) * 3) + 1];
      vec2.elements[2] = this.vertices[((index + 24 + 12) * 3) + 2] - this.vertices[((index + 25 + 12) * 3) + 2];

      normal.elements[0] = vec1.elements[1] * vec2.elements[2] - vec1.elements[2] * vec2.elements[1];
      normal.elements[1] = vec1.elements[2] * vec2.elements[0] - vec1.elements[0] * vec2.elements[2];
      normal.elements[2] = vec1.elements[0] * vec2.elements[1] - vec1.elements[1] * vec2.elements[0];
      normal.normalize();

      this.calculateSurfaceNormals(vec1, normal, index, false);

      this.normals[(index + 12) * 3    ] = normal.elements[0];
      this.normals[(index + 12) * 3 + 1] = normal.elements[1];
      this.normals[(index + 12) * 3 + 2] = normal.elements[2];

      this.normals[(index+24 + 12) * 3    ] = normal.elements[0];
      this.normals[(index+24 + 12) * 3 + 1] = normal.elements[1];
      this.normals[(index+24 + 12) * 3 + 2] = normal.elements[2];

      this.normals[(index + 12 + 1) * 3    ] = normal.elements[0];
      this.normals[(index + 12 + 1) * 3 + 1] = normal.elements[1];
      this.normals[(index + 12 + 1) * 3 + 2] = normal.elements[2];

      this.normals[(index + 24 + 12 + 1) * 3    ] = normal.elements[0];
      this.normals[(index + 24 + 12 + 1) * 3 + 1] = normal.elements[1];
      this.normals[(index + 24 + 12 + 1) * 3 + 2] = normal.elements[2];
      this.numOfNormals+=4;
    }
  }
  //calculates the last face's normals manually
  this.endNormals = function endNormals(index){
    var normal = new Vector3();
    var vec1   = new Vector3();
    var vec2   = new Vector3();

    vec1.elements[0] = this.vertices[this.numOfVertsC - 36      ] - this.vertices[(index + 12) * 3      ];
    vec1.elements[1] = this.vertices[(this.numOfVertsC - 36) + 1] - this.vertices[((index + 12) * 3) + 1];
    vec1.elements[2] = this.vertices[(this.numOfVertsC - 36) + 2] - this.vertices[((index + 12) * 3) + 2];

    vec2.elements[0] = this.vertices[(index + 36) * 3      ] - this.vertices[(this.numOfVertsC - 36)    ];
    vec2.elements[1] = this.vertices[((index + 36) * 3) + 1] - this.vertices[(this.numOfVertsC - 36) + 1];
    vec2.elements[2] = this.vertices[((index + 36) * 3) + 2] - this.vertices[(this.numOfVertsC - 36) + 2];

    normal.elements[0] = vec1.elements[1] * vec2.elements[2] - vec1.elements[2] * vec2.elements[1];
    normal.elements[1] = vec1.elements[2] * vec2.elements[0] - vec1.elements[0] * vec2.elements[2];
    normal.elements[2] = vec1.elements[0] * vec2.elements[1] - vec1.elements[1] * vec2.elements[0];
    normal.normalize();

    this.calculateSurfaceNormals(vec1, normal, index, false);

    this.normals[(index + 12) * 3    ] = (normal.elements[0]);
    this.normals[(index + 12) * 3 + 1] = (normal.elements[1]);
    this.normals[(index + 12) * 3 + 2] = (normal.elements[2]);

    this.normals[(index + 36) * 3    ] = (normal.elements[0]);
    this.normals[(index + 36) * 3 + 1] = (normal.elements[1]);
    this.normals[(index + 36) * 3 + 2] = (normal.elements[2]);

    this.normals[this.numOfVertsC - 36 - 36 - 36    ] = (normal.elements[0]);
    this.normals[this.numOfVertsC - 36 - 36 - 36 + 1] = (normal.elements[1]);
    this.normals[this.numOfVertsC - 36 - 36 - 36 + 2] = (normal.elements[2]);

    this.normals[this.numOfVertsC - 36    ] = (normal.elements[0]);
    this.normals[this.numOfVertsC - 36 + 1] = (normal.elements[1]);
    this.normals[this.numOfVertsC - 36 + 2] = (normal.elements[2]);
    this.numOfNormals+=4;
  }
  this.calculateSurfaceNormals = function calculateSurfaceNormals(vec1, normal, index,  flipFlop){
    if(flipFlop){
      this.surfaceNormals[this.numOfSurfaceNormals    ] = vec1.elements[0] / 2 + this.vertices[(index) * 3      ];
      this.surfaceNormals[this.numOfSurfaceNormals + 1] = vec1.elements[1] / 2 + this.vertices[((index) * 3) + 1];
      this.surfaceNormals[this.numOfSurfaceNormals + 2] = vec1.elements[2] / 2 + this.vertices[((index) * 3) + 2];
      this.numOfSurfaceNormals+=3;

      this.surfaceNormals[this.numOfSurfaceNormals    ] = vec1.elements[0] / 2 + this.vertices[(index) * 3      ] + normal.elements[0] * .1;
      this.surfaceNormals[this.numOfSurfaceNormals + 1] = vec1.elements[1] / 2 + this.vertices[((index) * 3) + 1] + normal.elements[1] * .1;
      this.surfaceNormals[this.numOfSurfaceNormals + 2] = vec1.elements[2] / 2 + this.vertices[((index) * 3) + 2] + normal.elements[2] * .1;
      this.numOfSurfaceNormals+=3;
    }else{
      this.surfaceNormals[this.numOfSurfaceNormals    ] = vec1.elements[0] / 2 + this.vertices[(index + 12) * 3      ];
      this.surfaceNormals[this.numOfSurfaceNormals + 1] = vec1.elements[1] / 2 + this.vertices[((index + 12) * 3) + 1];
      this.surfaceNormals[this.numOfSurfaceNormals + 2] = vec1.elements[2] / 2 + this.vertices[((index + 12) * 3) + 2];
      this.numOfSurfaceNormals+=3;

      this.surfaceNormals[this.numOfSurfaceNormals    ] = vec1.elements[0] / 2 + this.vertices[(index + 12) * 3      ] + normal.elements[0] * .1;
      this.surfaceNormals[this.numOfSurfaceNormals + 1] = vec1.elements[1] / 2 + this.vertices[((index + 12) * 3) + 1] + normal.elements[1] * .1;
      this.surfaceNormals[this.numOfSurfaceNormals + 2] = vec1.elements[2] / 2 + this.vertices[((index + 12) * 3) + 2] + normal.elements[2] * .1;
      this.numOfSurfaceNormals+=3;
    }
  }
  /**********************************************LIGHTING**********************************************/
  this.calculateLighting = function calculateLighting(){
    var d = 1;
    var p = this.numOfVertsC - 144;
    for(var i = p; i < this.numOfVertsC; i+=3){
      var temp=new Vector3();
      temp.elements[0] = this.normals[i];
      temp.elements[1] = this.normals[i+1];
      temp.elements[2] = this.normals[i+2];

      temp=this.normalMatrix.multiplyVector3(temp);
      temp = temp.normalize();

      var normalL = new Vector3();
      normalL.elements[0] = lightDirection.elements[0];
      normalL.elements[1] = lightDirection.elements[1];
      normalL.elements[2] = lightDirection.elements[2];
      normalL = normalL.normalize();

      var globalPosNorm = new Vector3();
      globalPosNorm.elements[0] = globalPos.elements[0];
      globalPosNorm.elements[1] = globalPos.elements[1];
      globalPosNorm.elements[2] = globalPos.elements[2];
      globalPosNorm = globalPosNorm.normalize();

      var diffuse = new Vector3();
      var spec    = new Vector3();

      if(directionalLightBool){
        diffuse = this.dirDiffuse(diffuse, temp, normalL);
        spec    = this.dirSpec(spec, temp, globalPosNorm);
      }

      var spec2 = new Vector3([0, 0, 0]);
      if(pointLight){
        diffuse = this.pointDiffuse(diffuse, temp, i);
        spec2   = this.pointSpec(spec2, temp, globalPosNorm, i);
      }

      if(specToggle){
        var finalColor = new Vector3([0,0,0]);
        finalColor.elements[0] = diffuse.elements[0];
        finalColor.elements[1] = (spec.elements[1] + spec2.elements[1]) > 1 ? 1 : (spec.elements[1] + spec2.elements[1]);
        finalColor.elements[2] = .2;

        this.colors[i]   = finalColor.elements[0];
        this.colors[i+1] = finalColor.elements[1];
        this.colors[i+2] = finalColor.elements[2];
      }else{
        this.colors[i]   = diffuse.elements[0];
        this.colors[i+1] = diffuse.elements[1];
        this.colors[i+2] = diffuse.elements[2] + .2;
      }
    }
  }
  this.dirSpec = function dirSpec(spec, temp, globalPosNorm){
    var halfwayNormal = halfwayVector(globalPosNorm, lightDirection);
    var light         = vector3Multiply(specularColor, lightColor);
    var nDotH         = dotProduct(temp, halfwayNormal);

    if(nDotH<0){
      nDotH = 0;
      //console.log(nDotH);
    }
    spec.elements[0] = light.elements[0] * Math.pow(nDotH, gloss);
    spec.elements[1] = light.elements[1] * Math.pow(nDotH, gloss);
    spec.elements[2] = light.elements[2] * Math.pow(nDotH, gloss);
    return spec;
  }
  this.dirDiffuse = function dirDiffuse(diffuse, temp, normalL){
    var nDotL = temp.elements[0] * normalL.elements[0] + 
                temp.elements[1] * normalL.elements[1] + 
                temp.elements[2] * normalL.elements[2];
    if(nDotL<0){
      nDotL = 0;
    }
    nDotL = nDotL;

    diffuse.elements[0] = lightColor.elements[0] * color.elements[0];
    diffuse.elements[1] = lightColor.elements[1] * color.elements[1];
    diffuse.elements[2] = lightColor.elements[2] * color.elements[2];

    diffuse.elements[0] = diffuse.elements[0] * nDotL;
    diffuse.elements[1] = diffuse.elements[1] * nDotL;
    diffuse.elements[2] = diffuse.elements[2] * nDotL;

    return diffuse;
  }
  this.pointSpec = function pointSpec(spec, temp, globalPosNorm, i){
    var normalizedPointDirection =new Vector3();
    normalizedPointDirection.elements[0] = secondLightPosition.elements[0] - this.vertices[i    ];
    normalizedPointDirection.elements[1] = secondLightPosition.elements[1] - this.vertices[i + 1];
    normalizedPointDirection.elements[2] = secondLightPosition.elements[2] - this.vertices[i + 2];

    var halfwayNormal2 = halfwayVector(globalPosNorm, normalizedPointDirection);
    var light2         = vector3Multiply(specularColor, secondLightColor);
    var nDotH2         = dotProduct(temp, halfwayNormal2);
    var spec2          = new Vector3();

    if(nDotH2<0){
      nDotH2=0;
    }

    spec2.elements[0] = light2.elements[0] * Math.pow(nDotH2,gloss);
    spec2.elements[1] = light2.elements[1] * Math.pow(nDotH2,gloss);
    spec2.elements[2] = light2.elements[2] * Math.pow(nDotH2,gloss);
    return spec2;
  }
  this.pointDiffuse = function pointDiffuse(diffuse, temp, i){
    var normalizedPointDirection =new Vector3();
    normalizedPointDirection.elements[0] = secondLightPosition.elements[0] - this.vertices[i    ];
    normalizedPointDirection.elements[1] = secondLightPosition.elements[1] - this.vertices[i + 1];
    normalizedPointDirection.elements[2] = secondLightPosition.elements[2] - this.vertices[i + 2];
    normalizedPointDirection=normalizedPointDirection.normalize();

    var nDotSL =temp.elements[0] * normalizedPointDirection.elements[0] + 
                temp.elements[1] * normalizedPointDirection.elements[1] + 
                temp.elements[2] * normalizedPointDirection.elements[2];

    if(nDotSL<0){
      nDotSL=0;
    }
    var col = new Vector3();
    col.elements[0] = secondLightColor.elements[0] * color.elements[0];
    col.elements[1] = secondLightColor.elements[1] * color.elements[1];
    col.elements[2] = secondLightColor.elements[2] * color.elements[2];

    diffuse.elements[0] += col.elements[0] * nDotSL;
    diffuse.elements[1] += col.elements[1] * nDotSL;
    diffuse.elements[2] += col.elements[2] * nDotSL;
    return diffuse;
  }
  /**********************************************SHADING**********************************************/
  this.flatShading = function flatShading(){
    this.loading();
    allBuffers();
  }
  this.smoothCriminal = function smoothCriminal(startPointIndex){
    for(var i=startPointIndex;i<startPointIndex+36;i+=3){
      var avgNormal = new Vector3([0,0,0]);

      avgNormal.elements[0] = (this.normals[i    ] + this.normals[i + 36    ]) / 2;
      avgNormal.elements[1] = (this.normals[i + 1] + this.normals[i + 36 + 1]) / 2;
      avgNormal.elements[2] = (this.normals[i + 2] + this.normals[i + 36 + 2]) / 2;

      this.normals[i    ] = avgNormal.elements[0];
      this.normals[i + 1] = avgNormal.elements[1];
      this.normals[i + 2] = avgNormal.elements[2];

      this.normals[i + 36    ] = avgNormal.elements[0];
      this.normals[i + 36 + 1] = avgNormal.elements[1];
      this.normals[i + 36 + 2] = avgNormal.elements[2];
    }
    for(var i=startPointIndex+72;i<startPointIndex+108;i+=3){
      var avgNormal = new Vector3([0,0,0]);
      avgNormal.elements[0] = (this.normals[i    ] + this.normals[i + 36    ]) / 2;
      avgNormal.elements[1] = (this.normals[i + 1] + this.normals[i + 36 + 1]) / 2;
      avgNormal.elements[2] = (this.normals[i + 2] + this.normals[i + 36 + 2]) / 2;

      this.normals[i    ] = avgNormal.elements[0];
      this.normals[i + 1] = avgNormal.elements[1];
      this.normals[i + 2] = avgNormal.elements[2];

      this.normals[i + 36    ] = avgNormal.elements[0];
      this.normals[i + 36 + 1] = avgNormal.elements[1];
      this.normals[i + 36 + 2] = avgNormal.elements[2];
    }
  }
  this.smoothShading = function smoothShading(){
    var num  = this.numOfVertsC / 144;
    var temp = this.numOfVertsC;
    this.numOfVertsC = 0;
    var n=0;

    for(n;n<num;n++){
      this.smoothCriminal(n*144); 
      this.numOfVertsC+=144;
      this.calculateLighting();
    }
    this.numOfVertsC = temp ; 
  }
  this.loading = function loading(){
    var tempIndex = this.numOfIndex;
    var tempVerts = this.numOfVertsC;

    this.normals = new Float32Array(5000);
    this.indices = new Uint16Array(5000);
    this.numOfIndex          = 0; 
    this.numOfVertsC         = 0;
    this.numberOfColors      = 0;
    this.numOfNormals        = 0;
    this.numOfCyl            = 0;
    this.numOfSurfaceNormals = 0;
    while(this.numOfIndex<tempIndex){
      this.numOfVertsC+=72;

      if(this.numOfCyl>0){
          this.transitionHandling();
      }

      this.numOfCyl++;
      this.numOfVertsC+=72;

      this.calculateIndicies();
      this.calculateLighting();
    }
  }

  /**********************************************BUFFERS**********************************************/
  //the function used to handle all the drawing and buffer handling in the entire program
  this.bufferHandling = function bufferHandling(){
    /**********************************************RESET**********************************************/
    //resets all the arrays to disabled and clears the screen to start redrawing the frame buffer
    gl.disableVertexAttribArray(surfaceNormal_Position);    //disable surface normals
    gl.disableVertexAttribArray(directionalLight_Position); //disable directional
    gl.disableVertexAttribArray(a_Position);                //disable position
    gl.disableVertexAttribArray(a_Color);                   //disable color
    gl.disableVertexAttribArray(b_Position);                //disable lines position

    /**********************************************LINES**********************************************/
    //the attribute arrays need to be enabled when you draw
    //sets the uniform doIt to 1 so that it colors the lines properly
    this.modelMatrix = new Matrix4();
    this.modelMatrix.translate(this.origin.elements[0],this.origin.elements[1],this.origin.elements[2]);
    this.modelMatrix.multiply(this.translateMatrix);
    this.modelMatrix.multiply(this.rotationMatrix);
    this.modelMatrix.multiply(this.scaleMatrix);
    this.modelMatrix.translate(-this.origin.elements[0],-this.origin.elements[1],-this.origin.elements[2]);
    this.normalMatrix.setInverseOf(this.modelMatrix);
    this.normalMatrix.transpose();

    if(!mode){
      this.smoothShading();//recalculate the lighting
    }else{
      this.loading();
    }

    if(numOfVerts>0){
      gl.uniformMatrix4fv(u_MvpMatrix, false, (mvpMatrix.multiply(this.modelMatrix)).elements);

      gl.uniform1i(boolio,1);
      gl.enableVertexAttribArray(b_Position);

      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, lineVert, gl.STATIC_DRAW);


      this.isMostRecent==true ? gl.drawArrays(gl.LINE_STRIP,0,numOfVerts/3) :  x = 0;
      

      gl.disableVertexAttribArray(b_Position);
    }else{
      gl.uniformMatrix4fv(u_MvpMatrix, false, (mvpMatrix.multiply(this.modelMatrix)).elements);
    }


    /**********************************************OBJECT**********************************************/
    //sets the uniform doIt to 0 so that it colors the object properly
    gl.uniform1f(alpha,this.alphaKey/255);//sets the alpha value for the object when its clicked

    gl.uniform1i(boolio,0);
    gl.enableVertexAttribArray(a_Position);  
    gl.enableVertexAttribArray(a_Color); 

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.drawElements(gl.TRIANGLES,this.numOfIndex,gl.UNSIGNED_SHORT,0);

    gl.disableVertexAttribArray(a_Position);
    gl.disableVertexAttribArray(a_Color);

    if(perspectiveBool){
      mvpMatrix.setOrtho(-1, 1,-1, 1,-1, 1);
    }else{
      mvpMatrix.setPerspective(30, 1, 1, 100);
      mvpMatrix.lookAt(globalPos.elements[0], globalPos.elements[1], globalPos.elements[2], 0, 0, 0, 0, 1, 0);
    }
    /**********************************************NORMALS**********************************************/
    //displayN determines whether or not the normals button has been pressed in the html file
    if(displayN){
      gl.uniform1i(boolio,2);

      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.surfaceNormals, gl.STATIC_DRAW);

      gl.enableVertexAttribArray(surfaceNormal_Position);

      gl.drawArrays(gl.LINES,0,this.numOfSurfaceNormals/3);

      gl.disableVertexAttribArray(surfaceNormal_Position);
      gl.uniform1i(boolio,0);
    }
    /**********************************************DIRECTIONAL**********************************************/
    //tells the shader to draw this object as pure red or if its clicked grey
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

    gl.uniform1i(boolio,3);
    gl.enableVertexAttribArray(directionalLight_Position);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, directionalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, dirVert, gl.STATIC_DRAW);

    gl.uniform1i(uniformObjectIndex,1);

    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

    gl.disableVertexAttribArray(directionalLight_Position);
    /**********************************************POINT**********************************************/
    //the point light at the top of the screen    
    gl.enableVertexAttribArray(a_Position); 

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
  }
  /**********************************************TRANSFORMATIONS**********************************************/
  this.calculateOrigin = function calculateOrigin(){
    this.origin = new Vector3();
    for(var i=0;i<this.numOfVertsC;i+=3){
      var tempVector = new Vector3([this.vertices[i],this.vertices[i + 1],this.vertices[i + 2]]);
      this.origin    = vector3Addition(tempVector, this.origin);
    }
    this.origin.elements[0] = this.origin.elements[0] / (this.numOfVertsC / 3);
    this.origin.elements[1] = this.origin.elements[1] / (this.numOfVertsC / 3);
    this.origin.elements[2] = this.origin.elements[2] / (this.numOfVertsC / 3);

    return this.origin;
  }
  this.translateModelMatrix = function translateModelMatrix(x,y,z){     //used for setting the translation matrix
    this.translateMatrix.translate(x,y,z);
  }
  this.rotationModelMatrix = function rotationModelMatrix(angle,x,y,z){ //used for setting the rotation matrix
    this.rotationMatrix.rotate(angle,x,y,z);
  }
  this.scaleModelMatrix = function scaleModelMatrix(x,y,z){             //used for setting the scale matrix
    this.scaleMatrix.scale(x,y,z);
  }
}
var meshObject = new MeshObject(5000);
var object = new MeshObject(5000);
var objectList = [];                  //the list for all objects in the scene
/**********************************************GLOBALS**********************************************/
//all the variables that need to stay global in order to keep everything running properly
//line verts
var numOfVerts = 0;
//global lighting variables
var gloss=1;
var secondLightPosition = new Vector3([0,1,0]);  //the position of the point light
var secondLightColor    = new Vector3([1,1,0]);  //the color of the point light
var lightDirection      = new Vector3([1,1,1]);  //the position of the directional light
var lightColor          = new Vector3([1,1,1]);  //the color of the directional light
var specularColor       = new Vector3([0,1,0]);  //the color of the specular light
var color               = new Vector3([1,0,0]);  //the color of the material of the object
//verticies/indicies
var cubeVertices        = new Float32Array(5000);//the verticies of the point lights cube
var cubeIndices         = new Uint16Array(5000); //the indicies of the point lights cube
var dirVert             = new Float32Array(100); //the verticies of the directional lights rect
var dirIndices          = new Uint16Array(2);    //the indicies of the directional lights rect
var lineVert            = new Float32Array(5000);//the verticies of the line thats rubberbanding
//buffers
var vertexBuffer;
var indexBuffer;
var lineBuffer;
var colorBuffer;
var normalBuffer;
//attribute/uniforms
var a_Position;
var a_Color;
var b_Position;
var uniformObjectIndex;
var surfaceNormal_Position;
var directionalLight_Position;
var boolio;
var clicked;
var pointBool;
var directionalBool;
var alpha;
//Global gl reference
var gl;
//misc
var radius=.05;
var enableMove=true;
var perspectiveBool=true;
var displayN = false;
var u_MvpMatrix;
var mvpMatrix;
var slider;
var radiusSlider;
var mode=true;
var specToggle=true;
var angle=10;
var globalPos=new Vector3([0,0,5]);
var directionalLightBool=true;
var pointLight=true;
var currentlyDrawing = false;
/**********************************************MAIN**********************************************/
//the main functions runs on the program starting and handles initialization and other things.
function main() {
  inputHandling();
  var canvas = document.getElementById('webgl');
  gl = WebGLUtils.setupWebGL(canvas,{preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  var n = initBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }
  canvas.onmousedown = function(ev){ click(ev, gl, canvas, a_Position); };
  canvas.onmousemove=function(ev){hover(ev,gl,canvas,a_Position);};
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  createDirectionLight();
  createCube();
}
function allBuffers(){
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);      //clears the frame buffer
    displayAll();
}
function inputHandling(){
  /**********************************************CAMERA**********************************************/
  document.onkeydown = function(ev){
    if(ev.keyCode == 65){
      var mat = new Matrix4();
      mat.setRotate(angle, 0, 1, 0);
      globalPos = mat.multiplyVector3(globalPos);
      mvpMatrix.setPerspective(30, 1, 1, 100);
      mvpMatrix.lookAt(globalPos.elements[0], globalPos.elements[1], globalPos.elements[2], 0, 0, 0, 0, 1, 0);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      allBuffers();
      //redraw the entire screen
      //iteratate through every object stored in the list and redo the shading like this for every single one
    }else if(ev.keyCode == 68){
        //D
      var mat = new Matrix4();
      mat.setRotate(-angle, 0, 1, 0);
      globalPos=mat.multiplyVector3(globalPos);
      mvpMatrix.setPerspective(30, 1, 1, 100);
      mvpMatrix.lookAt(globalPos.elements[0], globalPos.elements[1], globalPos.elements[2], 0, 0, 0, 0, 1, 0);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      allBuffers();
      //redraw the entire screen
    }else if(ev.keyCode==37){
      /**********************************************TRANSLATION**********************************************/
      //before rotating translate the object to the origin
      meshObject.calculateOrigin();
      meshObject.translateModelMatrix(-.01,0,0);
      allBuffers();
    }else if(ev.keyCode==38){
      //before rotating translate the object to the origin
      meshObject.calculateOrigin();
      meshObject.translateModelMatrix(0,.01,0);
      allBuffers();
    }else if(ev.keyCode==39){
      //before rotating translate the object to the origin
      meshObject.calculateOrigin();
      meshObject.translateModelMatrix(.01,0,0);
      allBuffers();
    }else if(ev.keyCode==40){
      //before rotating translate the object to the origin
      meshObject.calculateOrigin();
      meshObject.translateModelMatrix(0,-.01,0);
      allBuffers(); 
    /**********************************************ROTATION**********************************************/
    }else if(ev.keyCode==90){
      meshObject.calculateOrigin();
      meshObject.rotationModelMatrix(10,0,0,1);
      allBuffers();
    }else if(ev.keyCode==88){
      meshObject.calculateOrigin();
      meshObject.rotationModelMatrix(-10,0,0,1);
      allBuffers();
    /**********************************************SCALE**********************************************/
    }else if(ev.keyCode==67){
      meshObject.calculateOrigin();
      meshObject.scaleModelMatrix(2,2,2);
      allBuffers();
    }else if(ev.keyCode==86){
      meshObject.calculateOrigin();
      meshObject.scaleModelMatrix(.5,.5,.5);
      allBuffers();
    }
  }
  /**********************************************HTML**********************************************/
  slider=document.getElementById("sliderValue");
  slider.oninput = function(){
    gloss = this.value;
    //recalc the lighting
    allBuffers();
  }
  radiusSlider=document.getElementById("radiusSlider");
  radiusSlider.oninput = function(){
    radius = this.value;
  }
  setupIOSOR("fileName");//sets up the file loading and saving
}
/**********************************************LIGHTING**********************************************/
//creates the cube for the point light
function createCube(){
  var tempOffset=.1;
  cubeVertices = new Float32Array([   // Vertex coordinates
     tempOffset, tempOffset + 1, tempOffset,  -tempOffset, tempOffset + 1, tempOffset,  -tempOffset,-tempOffset + 1, tempOffset,   tempOffset,-tempOffset + 1, tempOffset,    // v0-v1-v2-v3 front
     tempOffset, tempOffset + 1, tempOffset,   tempOffset,-tempOffset + 1, tempOffset,   tempOffset,-tempOffset + 1,-tempOffset,   tempOffset, tempOffset + 1,-tempOffset,    // v0-v3-v4-v5 right
     tempOffset, tempOffset + 1, tempOffset,   tempOffset, tempOffset + 1,-tempOffset,  -tempOffset, tempOffset + 1,-tempOffset,  -tempOffset, tempOffset + 1, tempOffset,    // v0-v5-v6-v1 up
    -tempOffset, tempOffset + 1, tempOffset,  -tempOffset, tempOffset + 1,-tempOffset,  -tempOffset,-tempOffset + 1,-tempOffset,  -tempOffset,-tempOffset + 1, tempOffset,    // v1-v6-v7-v2 left
    -tempOffset,-tempOffset + 1,-tempOffset,   tempOffset,-tempOffset + 1,-tempOffset,   tempOffset,-tempOffset + 1, tempOffset,  -tempOffset,-tempOffset + 1, tempOffset,    // v7-v4-v3-v2 down
     tempOffset,-tempOffset + 1,-tempOffset,  -tempOffset,-tempOffset + 1,-tempOffset,  -tempOffset, tempOffset + 1,-tempOffset,   tempOffset, tempOffset + 1,-tempOffset     // v4-v7-v6-v5 back
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
//creates the visible red rectangle for directional lighting
function createRect(){
  var offset = .01;
  dirVert[0] = -offset;
  dirVert[1] =  offset;
  dirVert[2] = 0;

  dirVert[3] =  offset;
  dirVert[4] = -offset;
  dirVert[5] = 0;

  dirVert[6] = 1 - offset;
  dirVert[7] = 1 + offset;
  dirVert[8] = 1;

  dirVert[9 ] = 1 + offset;
  dirVert[10] = 1 - offset;
  dirVert[11] = 1;
}
function createDirectionLight(){
  createRect();
}
/**********************************************BUFFERS**********************************************/
function initBuffers(gl) {
  vertexBuffer      = gl.createBuffer();//the buffer for vertexes
  indexBuffer       = gl.createBuffer();//the buffer for indicies
  lineBuffer        = gl.createBuffer();//the buffer for lines
  colorBuffer       = gl.createBuffer();//the buffer for colors
  normalBuffer      = gl.createBuffer();//the buffer for normals
  directionalBuffer = gl.createBuffer();//the buffer for directionals

  var FSIZE = object.BYTES_PER_ELEMENT;

  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, lineVert, gl.STATIC_DRAW);

  b_Position = gl.getAttribLocation(gl.program,'b_Position');
  gl.vertexAttribPointer(b_Position, 3, gl.FLOAT, false, FSIZE * 3, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, object.vertices, gl.STATIC_DRAW);

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 3, 0);
  gl.enableVertexAttribArray(a_Position);
  //do colors  
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, object.colors, gl.STATIC_DRAW);

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
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, object.indices, gl.STATIC_DRAW);

  pointBool = gl.getUniformLocation(gl.program, 'point');
  gl.uniform1i(pointBool,1);

  directionalBool = gl.getUniformLocation(gl.program, 'directional');
  gl.uniform1i(directionalBool,1);

  u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) {
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }

  boolio = gl.getUniformLocation(gl.program, 'doIt');
  gl.uniform1i(boolio,0);

  uniformObjectIndex = gl.getUniformLocation(gl.program, 'objectIndex');
  gl.uniform1i(uniformObjectIndex,0);

  alpha = gl.getUniformLocation(gl.program, 'alpha');
  gl.uniform1f(alpha,1);

  clicked = gl.getUniformLocation(gl.program, 'clicked');
  gl.uniform1i(clicked,1);

  gl.clearColor(.9, .9, .9, 1.0);
  gl.enable(gl.DEPTH_TEST);

  mvpMatrix = new Matrix4();
  mvpMatrix.setOrtho(-1, 1,-1, 1,-1, 1);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
}
/**********************************************BOOLEANS**********************************************/
function swapPersp(){
  if(!perspectiveBool)
  {
    mvpMatrix.setOrtho(-1, 1,-1, 1,-1, 1);
    perspectiveBool=true;
  }else{
    mvpMatrix.setPerspective(30, 1, 1, 100);
    mvpMatrix.lookAt(0, 0, 5, 0, 0, 0, 0, 1, 0);
    perspectiveBool=false;
  }
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  allBuffers();
}
function displayNormals(){
  if(displayN){
    displayN=false;
  }else{
    displayN=true;
  }
  allBuffers();
}
function toggleSpecular(){
  if(specToggle){
    specToggle = false;
    allBuffers();
  }else{
    specToggle = true;
    allBuffers();
  }
}
function toggleShading(){
  if(mode==true){
    //smooth itm
    mode=false;
    allBuffers();
  }else{
    //flat it
    mode=true;
    allBuffers();
  }
}
/**********************************************MATH**********************************************/
function dotProduct(vec1,vec2){
  var dot;
  dot=(vec1.elements[0] * vec2.elements[0]) + (vec1.elements[1] * vec2.elements[1]) + (vec1.elements[2] * vec2.elements[2]);
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
  var LV    = vector3Addition(light,vec1);
  var magLV = magnitude(LV);
  halfwayN  = vector3Divide(LV,magLV);
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
/**********************************************MISC**********************************************/
function hover(ev,gl,canvas,a_Position){
  if(enableMove){
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
    y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);
    if(numOfVerts>0){
      //moves the position of the last placed verticy
      lineVert[numOfVerts - 3] = x;
      lineVert[numOfVerts - 2] = y;
      lineVert[numOfVerts - 1] = 0;
      allBuffers();
    }
  }
}
function changeBackground(){
  gl.clearColor(Math.floor(Math.random()*100)/100,
         Math.floor(Math.random()*100)/100,
         Math.floor(Math.random()*100)/100,
         Math.floor(Math.random()*100)/100);
  allBuffers();
}
function displayAll(){

  for(var i=0;i<objectList.length;i++){
    objectList[i].bufferHandling();
  }
}
function click(ev, gl, canvas, a_Position) {
  var x = ev.clientX;
  var y = ev.clientY; 
  var rect = ev.target.getBoundingClientRect() ;

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  if(enableMove){
    if(ev.button==0){
      if(!currentlyDrawing){
        //creates a new object
        meshObject.isMostRecent = false;
        objectList.push(new MeshObject(5000));
        objectList[objectList.length-1].alphaKey = 255-(objectList.length);  
        //sets that object as the currently selected object
        meshObject              = objectList[objectList.length - 1];//sets the current object
        meshObject.isMostRecent = true;                             //sets if the object is the most recent
      }
      currentlyDrawing = true;
      var z = 0;
      numOfVerts+=3;

      lineVert[numOfVerts - 3] = x;
      lineVert[numOfVerts - 2] = y;
      lineVert[numOfVerts - 1] = z;
      if(numOfVerts>3){
         meshObject.drawCylinder(gl);
      }
      numOfVerts+=3;

      lineVert[numOfVerts - 3]= x;
      lineVert[numOfVerts - 2]= y;
      lineVert[numOfVerts - 1]= z;
    }else if(ev.button==2){
      currentlyDrawing=false;
      //enableMove=false;
      numOfVerts+=3;

      lineVert[numOfVerts - 3]= x;
      lineVert[numOfVerts - 2]= y;
      lineVert[numOfVerts - 1]= z;

      meshObject.drawCylinder(gl);

      //reset for multiple gc
      lineVert = new Float32Array(5000);
      numOfVerts = 0;
      enableMove = true;
    }
    allBuffers();
  }else{
    checkObject(ev);//if enableMove is false and you click check the object else draw
  }
}
function toggleDraw(){
  enableMove ? enableMove = false : enableMove = true;
  enableMove ? document.getElementById("curr").innerHTML="Current = Draw" : document.getElementById("curr").innerHTML="Current = Transform";
}
function checkAlphaKeys(key){
  for (var i = 0; i < objectList.length; i++) {
    if(objectList[i].alphaKey==key){//goes through every object and checks its alpha for the one recieved
      return true;
    }
  }
  return false;
}
function getMeshObject(key){
  for (var i = 0; i < objectList.length; i++) {
    if(objectList[i].alphaKey==key){//goes through every object and checks its alpha for the one recieved
      return i;
    }
  }
}
function checkObject(ev){
  var x    = ev.clientX, y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  var x_in_canvas = x - rect.left
  var y_in_canvas = rect.bottom - y;
  var picked=false;
  //x and y are the mouse positions
  //set the bool to red
  gl.uniform1i(clicked,0);//sets everything to pure red
  allBuffers();//draws everything in pure red
  //draw it to the screen
  var pixels = new Uint8Array(4); // Array for storing the pixel value
  gl.readPixels(x_in_canvas, y_in_canvas, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  if (pixels[0] == 255){//checks if the pixel is red where you clicked
    //check every alpha key
    if(checkAlphaKeys(pixels[3])){
      meshObject = objectList[getMeshObject(pixels[3])];//doesnt work
    }else{
      //no object matched
      console.log("no match");
    }
    if(pixels[3]==153){//checks if you clicked the directionalLight
      if(directionalLightBool){
        directionalLightBool=false;
        gl.uniform1i(directionalBool,0);
      }else{
        directionalLightBool=true;
        gl.uniform1i(directionalBool,1);
      }
    }else if(pixels[3]==128){//checks if you cicked the pointlight
      if(pointLight){
        pointLight=false;
        gl.uniform1i(pointBool,0);
      }else{
        pointLight=true;
        gl.uniform1i(pointBool,1);
      }
    } 
  }else{
    console.log("not there");
  }

  gl.uniform1i(clicked, 1);  // Pass false to u_Clicked(rewrite the cube)
  allBuffers();
  //redraw to the sceen
}
//reads the data from the saved SOR file and fills the arrays for drawing
function readSOR(){
  var SORObj = readFile();
  //reset all the variables and arrays then load them in like this
  if(SORObj!=null){
    var numV=0;
    for(var i=0;i<5000;i++){
      meshObject.vertices[i]=SORObj.vertices[i];
      numV++;
    }
    var num=0;
    for(var i=0;i<SORObj.indexes[4999];i++){
      meshObject.indices[i]=SORObj.indexes[i];
      num++;
    }
    //gets the index and verts values from the file
    meshObject.numOfIndex=SORObj.indexes[4999];
    meshObject.numOfVertsC=SORObj.vertices[4998];
    meshObject.numOfVerts=3;
    allBuffers();
  }
}
//saves the cylinder as an obj
function saveSOR(){
  meshObject.indices[4999] = numOfIndex;
  meshObject.indices[4998] = numOfVertsC;
  var p = prompt("Please enter your file name", "temperooni");

  if (p != null) {
    document.getElementById("fileName").innerHTML = p;
  }

  saveFile(new SOR(p, cVert, indices));
}
//todo
//multiple gcs not drawing
//loading in new gc's
//possibly loading the matrix for that gc's position
//make the transformations off mouse input