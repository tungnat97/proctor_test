import * as React from 'react'
import * as faceApi from 'face-api.js'

export default class Proctor extends React.Component {
  faceMatcher!: faceApi.FaceMatcher
  mediaStream!: MediaStream
  canvas: React.RefObject<HTMLCanvasElement> = React.createRef()
  referenceImage: React.RefObject<HTMLImageElement> = React.createRef()
  video: React.RefObject<HTMLVideoElement> = React.createRef()

  state: {
    switchApp: string
    multiplePeople: string
    noPerson: string
    differentPerson: string
  } = {
    switchApp: '',
    multiplePeople: '',
    noPerson: '',
    differentPerson: '',
  }
  componentDidMount() {
    this.run()
  }

  run = async () => {
    try {
      faceApi.env.monkeyPatch({
        Canvas: HTMLCanvasElement,
        Image: HTMLImageElement,
        ImageData: ImageData,
        Video: HTMLVideoElement,
        createCanvasElement: () => document.createElement('canvas'),
        createImageElement: () => document.createElement('img'),
      })
      await faceApi.nets.tinyFaceDetector.loadFromUri('/assets/models')
      await faceApi.nets.faceRecognitionNet.loadFromUri('/assets/models')
      await faceApi.nets.faceLandmark68Net.loadFromUri('/assets/models')
      await faceApi.nets.ssdMobilenetv1.loadFromUri('/assets/models')

      const results = await faceApi
        .detectAllFaces(this.referenceImage.current!)
        .withFaceLandmarks()
        .withFaceDescriptors()

      this.faceMatcher = new faceApi.FaceMatcher(results)

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      })
      if (this.video.current !== null) {
        this.video.current.srcObject = this.mediaStream
      }
    } catch (e) {
      console.log(e)
    }
  }

  onPlay = async () => {
    if (this.video.current?.paused || this.video.current?.ended || !faceApi.nets.tinyFaceDetector.params) {
      setTimeout(() => this.onPlay())
      return
    }

    const options = new faceApi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5,
    })

    const results = await faceApi
      .detectAllFaces(this.video.current!, options)
      .withFaceLandmarks()
      .withFaceDescriptors()

    if (results.length) {
      if (results.length > 1) {
        // window.api.send("violate-face", "multiple-people");
        // $('#multiple_people').html('More than 1 person! ' + new Date().toLocaleTimeString());
        this.setState({ multiplePeople: 'Multiple people: ' + new Date().toLocaleTimeString() })
      } else {
        const result = results[0]
        // const canvas = $('#overlay').get(0);
        const dims = faceApi.matchDimensions(this.canvas.current!, this.video.current!, true)
        const resizedResults = faceApi.resizeResults(result, dims)
        const label = this.faceMatcher.findBestMatch(result.descriptor).toString()
        if (label.includes('unknown')) {
          // window.api.send("violate-face", "different-person");
          // $('#different_person').html('Different person! ' + new Date().toLocaleTimeString());
          this.setState({ differentPerson: 'Different person: ' + new Date().toLocaleTimeString() })
        } else {
          // $('#result').html('Okay. ' + new Date().toLocaleTimeString());
        }
        const options = { label }
        const drawBox = new faceApi.draw.DrawBox(result.detection.box, options)
        drawBox.draw(this.canvas.current!)
      }
    } else {
      // window.api.send("violate-face", "no-person");
      // $('#no_person').html('No person!' + new Date().toLocaleTimeString());
      this.setState({ noPerson: 'No person: ' + new Date().toLocaleTimeString() })
    }

    setTimeout(() => this.onPlay(), 1000)
  }

  render() {
    return (
      <div className="App">
        <div style={{ overflow: 'hidden' }}>
          <div style={{ float: 'left' }}>
            <video ref={this.video} onPlay={this.onPlay} autoPlay></video>
            <canvas ref={this.canvas} style={{ position: 'absolute', top: '0px', left: '0px' }} />
          </div>
          <div style={{ position: 'relative', float: 'left' }}>
            <img
              id="referenceImage"
              ref={this.referenceImage}
              src="assets/tung.jpg"
              style={{ maxWidth: '128px' }}
            />
            <canvas style={{ position: 'absolute', top: '0px', left: '0px' }} />
          </div>
          <div>
            <div>{this.state.switchApp}</div>
            <div>{this.state.noPerson}</div>
            <div>{this.state.differentPerson}</div>
            <div>{this.state.multiplePeople}</div>
            <div id="monitors"></div>
            <div id="maximized"></div>
            <div id="drives"></div>
          </div>
        </div>
      </div>
    )
  }
}
