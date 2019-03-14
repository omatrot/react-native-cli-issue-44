import React from 'react';
import RX from 'reactxp';
import { AppState, Platform, EmitterSubscription, PermissionsAndroid } from 'react-native';
import { BleManager, Device, LogLevel } from 'react-native-ble-plx';
import RNFS from 'react-native-fs';

import { LineChart } from 'react-native-charts-wrapper';

import { AnimatedCircularProgress } from 'react-native-circular-progress';

// Do not change the way this component is imported
// This is because it is exported as default
// You should not import it as a named export
import CountDown from 'react-native-countdown-component';

import GenerateForm from 'react-native-form-builder';

import { Col, Row, Grid } from "react-native-easy-grid";

const window = RX.UserInterface.measureWindow();

const styles = {
  container: RX.Styles.createViewStyle({
    flex: 1,
    backgroundColor: '#FFF',
    width: window.width,
    height: window.height
  }),
  horizontalContainer: RX.Styles.createViewStyle({
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    backgroundColor: '#152d44',
    padding: 50,

  }),
  scroll: RX.Styles.createScrollViewStyle({
    flex: 1,
    backgroundColor: '#f0f0f0',
    margin: 10,
  }),
  row: RX.Styles.createViewStyle({
    margin: 10
  }),
  chart: RX.Styles.createViewStyle({
    flex: 1
  }),
  pointsDelta: RX.Styles.createTextStyle({
    color: '#4c6479',
    fontSize: 50,
    fontWeight: "100"
  }),
  points: RX.Styles.createTextStyle({
    backgroundColor: 'transparent',
    width: 90,
    textAlign: 'center',
    color: '#7591af',
    fontSize: 50,
    fontWeight: "100"
  }),
  pointsDeltaActive: RX.Styles.createTextStyle({
    color: '#fff',
  }),
  submitButton: RX.Styles.createButtonStyle({
    paddingHorizontal: 10,
    paddingTop: 20,
  }),
  button: RX.Styles.createButtonStyle({
    backgroundColor: '#ddd',
    borderWidth: 1,
    margin: 20,
    padding: 12,
    borderRadius: 8,
    borderColor: 'black'
  }),
  wrapper: RX.Styles.createViewStyle({
    flex: 1,
    marginTop: 150,
  }),
};

interface IAppState {
  ready: boolean;
  scanning: boolean;
  peripherals: Map<string, Device>;
  connectedPeripheral: Device | null;
  appState: string;
  spO2?: number;
  pulseRate?: number;
  timeToSave: boolean;
  processingData: boolean;
}

interface IAppProps extends RX.CommonProps {

}

export class App extends RX.Component<IAppProps, IAppState> {

  private handlerDiscover!: EmitterSubscription;
  private handlerStop!: EmitterSubscription;
  private handlerDisconnect!: EmitterSubscription;

  private bleManager: BleManager;

  constructor(props: IAppProps) {
    super(props);

    this.state = {
      ready: false,
      scanning: false,
      peripherals: new Map(),
      connectedPeripheral: null,
      appState: '',
      timeToSave: false,
      processingData: false
    }

    this.bleManager = new BleManager();
    this.bleManager.setLogLevel(LogLevel.Verbose);
  }

  logWithTimestamp = (message?: any, ...optionalParams: any[]) => {
    console.log(`${this.getTimeAsStringForLog()} : ${message}`, ...optionalParams);
  }

  componentDidMount() {
    AppState.addEventListener('change', this.handleAppStateChange);

    if (Platform.OS === 'ios') {
      this.bleManager.onStateChange((state) => {
        if (state === 'PoweredOn')
          this.nowReady();
      });
    } else {
      this.nowReady();
    }

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
        if (result) {
          this.logWithTimestamp("Permission is OK");
        } else {
          PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
            if (result) {
              this.logWithTimestamp("User accept");
            } else {
              this.logWithTimestamp("User refuse");
            }
          });
        }
      });
    }

  }

  private nowReady() {
    this.setState((prevState, _props) => {
      const newState = { ...prevState };
      newState.ready = true;
      return newState;
    });
  }

  handleAppStateChange(nextAppState: any) {
    if (this.state) {
      if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
        this.logWithTimestamp('App has come to the foreground!')
        this.bleManager.connectedDevices([]).then(devices => {
          devices.forEach(device => {
            device.isConnected().then((yes: boolean) => {
              if (yes) {
                this.logWithTimestamp('Connected peripheral: ' + device);
              }
            });
          });

        });
      }
      this.setState({ appState: nextAppState });
    }
  }

  componentWillUnmount() {
    this.handlerDiscover.remove();
    this.handlerStop.remove();
    this.handlerDisconnect.remove();
  }

  getStoragePath = () => {
    const formValues = this.formGenerator && this.formGenerator.getValues();
    var path = formValues;
    if (RX.Platform.getType() === 'ios')
      path = RNFS.DocumentDirectoryPath;
    // /data/user/0/com.myheartsigns/files/
    else if (RX.Platform.getType() === 'android')
      path = RNFS.DocumentDirectoryPath;
    return path;
  }
 
  private formGenerator: any;

  render() {
    if (this.state.timeToSave) {
      const fields = [
        {
          type: 'text',
          name: 'subject_first_name',
          required: true,
          icon: 'ios-person',
          label: 'First Name',
        },
        {
          type: 'text',
          name: 'subject_last_name',
          required: true,
          icon: 'ios-person',
          label: 'Last Name',
        },
        {
          type: 'number',
          name: 'age',
          required: true,
          label: 'Age',
        },

      ];
      return (
        <RX.View style={styles.wrapper}>
          <RX.View>
            <GenerateForm
              ref={(c: any) => {
                this.formGenerator = c;
              }}
              fields={fields}
            />
          </RX.View>
          <RX.View style={styles.submitButton}>
            <RX.Button style={styles.button} onPress={() => this.saveData()}>
              <RX.Text style={{ textAlign: 'center' }}>Save</RX.Text>
            </RX.Button>
          </RX.View>
        </RX.View>
      );
    } else
      return (
        <RX.View style={styles.container}>
          <RX.Button style={styles.button} onPress={() => this.handleStartStopButton()}>
            <RX.Text style={{ textAlign: 'center' }}>{this.state.processingData ? 'Stop' : 'Start'}</RX.Text>
          </RX.Button>
          <Grid>
            <Row>
              <Col>
                <RX.View style={{ alignItems: 'center' }}>
                  <AnimatedCircularProgress
                    size={120}
                    width={5}
                    // Pulse Rate is in BPM
                    // Assume that the highest pulse rate is 240 BPM
                    // 255 is an invalid value (no finger)
                    fill={Math.round(((!!!this.state.pulseRate || this.state.pulseRate == 255) ? 0 : (this.state.pulseRate * 100) / 240))}
                    tintColor="#00e0ff"
                    backgroundColor="#3d5875"

                  >
                    {
                      () => (
                        <RX.Text
                          style={styles.points}
                        >
                          {(!!!this.state.pulseRate || this.state.pulseRate === 255) ? 'X' : this.state.pulseRate}
                        </RX.Text>
                      )
                    }
                  </AnimatedCircularProgress>
                  <RX.Text>Pluse Rate</RX.Text>
                </RX.View>
              </Col>
              <Col>
                <RX.View style={{ alignItems: 'center' }}>

                  <AnimatedCircularProgress
                    size={120}
                    width={5}
                    // spO2 is already a percentage
                    // 127 is an invalid value (no finger)
                    fill={(!!!this.state.spO2 || this.state.spO2 === 127) ? 0 : this.state.spO2}
                    tintColor="#00e0ff"
                    backgroundColor="#3d5875"
                  >
                    {
                      () => (
                        <RX.Text
                          style={styles.points}
                        >
                          {(!!!this.state.spO2 || this.state.spO2 === 127) ? 'X' : this.state.spO2}
                        </RX.Text>
                      )
                    }
                  </AnimatedCircularProgress>
                  <RX.Text>SpO2</RX.Text>

                </RX.View>
              </Col>
            </Row>
            <Row>
              <Col>
                <RX.View style={{ alignItems: 'center' }}>
                  {
                    this.state.processingData &&
                    <CountDown
                      until={60 * 2}
                      size={20}
                      onFinish={() => {
                        if (this.state.processingData)
                          this.handleStartStopButton();
                      }
                      }
                      digitStyle={{ backgroundColor: '#FFF' }}
                      digitTxtStyle={{ color: '#1CC625' }}
                      timeToShow={['M', 'S']}
                      timeLabels={{ m: 'MM', s: 'SS' }}
                    />
                  }
                </RX.View>
              </Col>
            </Row>
          </Grid>

          <LineChart style={styles.chart}
            data={{
              dataSets: [{
                label: "Pleth Wave",
                values: [0, 2, 0],
                config: {
                  drawValues: false,
                  mode: "CUBIC_BEZIER",
                  drawCircles: false,
                  lineWidth: 2
                }
              },
              ]
            }}
          />
        </RX.View>
      );
  }

  private handleStartStopButton = () => {
  }

  private getTimeAsStringForLog = () => {
    var date = new Date(),
      hour = date.getHours().toString(),
      formatedHour = (hour.length === 1) ? ("0" + hour) : hour,
      minute = date.getMinutes().toString(),
      formatedMinute = (minute.length === 1) ? ("0" + minute) : minute,
      second = date.getSeconds().toString(),
      formatedSecond = (second.length === 1) ? ("0" + second) : second,
      millisedonds = date.getMilliseconds().toString();
    return formatedHour + ':' + formatedMinute + ':' + formatedSecond + '.' + millisedonds;
  }

  private saveData = () => {

  }
}
