from flask import Flask, jsonify, request
from flask_cors import CORS
from sds011lib import SDS011QueryReader

sensor_port = "/dev/ttyUSB0"
sensor = SDS011QueryReader(sensor_port)

app = Flask(__name__)
CORS(app)

def get_data(pm):
	aqi = sensor.query()
	if pm == "2.5":
		return aqi.pm25
	else:
		return aqi.pm10

@app.route('/latest', methods=['GET'])
def latest():
	return jsonify({
		"pm10": get_data("10"),
		"pm25": get_data("2.5")
	})

if __name__ == '__main__':
	app.run(host='0.0.0.0', port=5000, debug=True)
