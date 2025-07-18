# DentistFriend - Record Manager 🦷

## Project Description

DentistFriend is a modern dental practice management solution designed specifically for dental professionals. This comprehensive platform streamlines patient record management, procedure tracking, and practice analytics, making it easier for dentists to manage their daily operations efficiently.

### Key Features

- **Patient Management**: Register patients, manage records, and track procedures with comprehensive treatment history
- **Financial Tracking**: Monitor cash and insurance payments with detailed revenue analytics  
- **Procedure Management**: Automated pricing from Excel sheets with support for multiple insurance providers
- **Analytics Dashboard**: Visual insights into practice performance with interactive charts and statistics
- **Modern UI**: Clean, responsive interface optimized for dental practice workflows

### Disclaimer

Please note that **DentistFriend** is not intended to replace or infringe upon any existing commercial dental management software. Our goal is to offer a **free, open-source alternative** that emphasizes simplicity, accessibility, and affordability, especially for dental professionals in underserved or remote areas.

## Getting Started

### Prerequisites

- Python 3.x installed on your system
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation & Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/dentistnoor/DentistFriend-V2.git
   cd DentistFriend-V2
   ```

2. Start the local server:

   ```bash
   python -m http.server 8080
   ```

3. Open your browser and navigate to:

   ```text
   http://localhost:8080
   ```

4. Click "Launch Application" to start using DentistFriend!

### Usage

1. **Login**: Enter your doctor credentials to access the dashboard
2. **Dashboard**: View practice statistics and key metrics
3. **Add Patients**: Use the streamlined form to register new patients
4. **Track Procedures**: Select from pre-loaded procedure lists with automatic pricing
5. **Analytics**: Monitor practice performance with visual charts and reports
6. **Settings**: Update your profile information as needed

## Project Structure

```text
DentistFriend-V2/
├── data/                    # Excel files for pricing
│   ├── cash/               # Cash procedure pricing
│   └── insurance/          # Insurance company pricing
├── src/                    # Main application source
│   ├── html/              # HTML pages
│   ├── css/               # Stylesheets
│   └── js/                # JavaScript logic
└── index.html             # Entry point
```

## Features in Detail

- **🏥 Multi-Payment Support**: Handle both cash and insurance patients
- **📊 Real-time Analytics**: Track revenue, patient types, and popular procedures
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **💾 Local Storage**: Patient data persists between sessions
- **🎨 Modern UI**: Professional medical-grade color scheme and typography

## License

This project is licensed under the [MIT License](LICENSE).

## Authors

[Dr. Noor Hebbal](https://github.com/dentistnoor) - [Areeb Ahmed](https://github.com/areebahmeddd)

## Built with ❤️ for the dental community
