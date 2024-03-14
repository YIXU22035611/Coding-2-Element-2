let boids = [];
let word = "dispersoidological";
let repetitions = 5;
let circleRadius = 30;
let isDispersing = false;
let wordList = ["Face fear", "inner eye", "see path", "extermination", "))))))", "))))))", "))))))", "As written", "))))))", "not fear.", "))))))", "))))))", " Here I am.", "", "))))))", "))))))", "))))))", "remain.", "As written", "spice" ];

let video;
let faceapi;
let detections = [];
let myFont;
let points;
let textBox;
const fSize = 160;
let startColor;
let endColor;
let bgmusic;
let originalPoints = [];




function preload() {
  myFont = loadFont("dune.ttf"); 
  bgmusic = loadSound("bgmusic.m4a"); 
}
function setup() {
    createCanvas(windowWidth, windowHeight);
    

    let initialVelocity = p5.Vector.random2D();
    initialVelocity.mult(random(2, 4));
    for (let i = 0; i < wordList.length; i++) { //choose the word in the film
        let sentence = wordList[i];
        boids.push(new Boid(random(width), random(height), sentence, initialVelocity.copy()));
    }


 
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  const options = { withLandmarks: true, withDescriptors: false };
  faceapi = ml5.faceApi(video, options, () => console.log('Model loaded!'));
  faceapi.detect(gotResults);

 
  points = myFont.textToPoints("DU N E", 0, 0, fSize, { sampleFactor: 0.25 });
  textBox = myFont.textBounds("DU N E", 0, 0, fSize);
  originalPoints = points.map(p => ({ x: p.x, y: p.y }));

  startColor = color(0, 255, 0);
  endColor = color(255, 0, 0);

  bgmusic.loop();
  noStroke();
}

function draw() {
  background(255);
  image(video, 0, 0, width, height);

  //fill(200, 200, 250, 255); // the circle in the central 
  //ellipse(width / 2, height / 2, circleRadius * 2, circleRadius * 2);

  for (let boid of boids) {
    boid.update();
    boid.display();
  }

  
  checkEyesPosition();

 
  let avgEyeX = calculateAverageEyePosition(detections);

  translate(width / 2 - textBox.w / 2, height / 2 + textBox.h / 2);
  let t = (sin(millis() / 2000) + 1) / 2;
  let currentColor = lerpColor(startColor, endColor, t);

  points.forEach((point, index) => {
    let originalPoint = originalPoints[index];
    let dispFactor = map(avgEyeX, 0, width, 40, -40);
    let dispX = originalPoint.x + (dispFactor * random(-1, 1));
    let dispY = originalPoint.y + (dispFactor * random(-1, 1));

    fill(red(currentColor), green(currentColor), blue(currentColor), random(50, 255));
    square(dispX, dispY, random(5, 15));
  });

  if (detections.length > 0) {
    drawEyes(detections);
  }
}


function checkEyesPosition() {
  let isAnyEyeWithinCircle = false;

  detections.forEach(detection => {
    const { leftEye, rightEye } = detection.parts;
    
    // left and right eye positions
    [leftEye, rightEye].forEach(eye => {
      const eyeCenter = eye.reduce((acc, curr) => {
        acc.x += curr._x;
        acc.y += curr._y;
        return acc;
      }, { x: 0, y: 0 });

      eyeCenter.x /= eye.length;
      eyeCenter.y /= eye.length;

      
      const d = dist(eyeCenter.x, eyeCenter.y, width / 2, height / 2);
      if (d < circleRadius) {
        isAnyEyeWithinCircle = true;
      }
    });
  });

  isDispersing = isAnyEyeWithinCircle;
}


class Boid {
    constructor(x, y, sentence, velocity) {
        this.position = createVector(x, y);
        this.velocity = velocity;
        this.acceleration = createVector();
        this.sentence = sentence; 
        this.maxSpeed = 4;
        this.history = [];
        this.maxHistorySize = 10;
    }

  update() {
    let force = isDispersing ? this.disperse() : this.towardCenter();
    this.applyForce(force);
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
    this.checkBounds();

  
    this.history.push({ x: this.position.x, y: this.position.y });
    if (this.history.length > this.maxHistorySize) {
      this.history.shift(); 
    }
  }

   display() {
       
        for (let i = 0; i < this.history.length; i++) {
            let pos = this.history[i];
            let alpha = map(i, 0, this.history.length, 50, 255);
            
            
            fill(0, 0, 255, 127);
            textSize(16); 
            textAlign(CENTER, CENTER);
            text(this.sentence, pos.x, pos.y);
        }
    }
   
  towardCenter() {
    let center = createVector(width / 2, height / 2);
    return p5.Vector.sub(center, this.position).setMag(0.1);
  }

  disperse() {
    return p5.Vector.sub(this.position, createVector(width / 2, height / 2)).setMag(0.1);
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

   checkBounds() {
    if (this.position.x < 0 || this.position.x > width) {
      this.velocity.x *= -1;
    }
    if (this.position.y < 0 || this.position.y > height) {
      this.velocity.y *= -1;
    }
  }
}


function gotResults(err, result) {
  if (err) {
    console.error(err);
    return;
  }
  detections = result;
  faceapi.detect(gotResults);
}


function calculateAverageEyePosition(detections) {
  if (detections.length === 0) return width / 2;
  let sumX = 0;
  let count = 0;
  detections.forEach(detection => {
    detection.parts.leftEye.concat(detection.parts.rightEye).forEach(point => {
      sumX += point._x;
      count++;
    });
  });
  return sumX / count;
}


function drawEyes(detections) {
  fill(0, 0, 255, 127); 
  noStroke();
  detections.forEach(detection => {
    const { leftEye, rightEye } = detection.parts;
    drawEye(leftEye);
    drawEye(rightEye);
  });
}

function drawEye(eye) {
  let eyeCenterX = eye.reduce((sum, p) => sum + p._x, 0) / eye.length;
  let eyeCenterY = eye.reduce((sum, p) => sum + p._y, 0) / eye.length;

  fill(0, 0, 255, 127); 
  beginShape();
  for (let v of eye) {
    curveVertex(v._x-45, v._y-280);
  }
  endShape(CLOSE);
}
