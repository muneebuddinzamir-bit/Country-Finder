document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const searchBtn = document.getElementById('searchBtn');
  const countryInput = document.getElementById('countryInput');
  const resultsContainer = document.getElementById('resultsContainer');
  const errorMessage = document.getElementById('errorMessage');
  const loading = document.querySelector('.loading');
  const flagImg = document.getElementById('countryFlag');

  const SERVICE_URL = 'https://cors-anywhere.herokuapp.com/http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso';

  // Local country list (add more if needed)
  const countryList = [
    "Pakistan", "India", "United States", "United Kingdom", "Australia", "Canada",
    "Germany", "France", "China", "Japan", "Saudi Arabia", "United Arab Emirates",
    "Afghanistan", "Bangladesh", "Brazil", "Russia", "South Africa", "New Zealand"
  ];

  // Event Listeners
  searchBtn.addEventListener('click', fetchCountryInfo);
  countryInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') fetchCountryInfo();
  });

  // SOAP Fetch Helper
  async function soapFetch(soapAction, bodyXml) {
    const res = await fetch(SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: bodyXml
    });

    if (!res.ok) throw new Error('Network response was not ok');

    const text = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    const fault = xmlDoc.getElementsByTagName('faultstring')[0];
    if (fault) throw new Error(fault.textContent);

    return xmlDoc;
  }

  // Build SOAP envelope
  const buildSoapEnvelope = (bodyContent) => `
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        ${bodyContent}
      </soap:Body>
    </soap:Envelope>`;

  // Get Country ISO Code
  async function getCountryISOCode(name) {
    const body = `
      <CountryISOCode xmlns="http://www.oorsprong.org/websamples.countryinfo">
        <sCountryName>${name}</sCountryName>
      </CountryISOCode>`;
    
    const xml = await soapFetch('http://www.oorsprong.org/websamples.countryinfo/CountryISOCode', buildSoapEnvelope(body));
    return xml.getElementsByTagName('m:CountryISOCodeResult')[0]?.textContent || null;
  }

  // Get Full Country Info
  async function getFullCountryInfo(isoCode) {
    const body = `
      <FullCountryInfo xmlns="http://www.oorsprong.org/websamples.countryinfo">
        <sCountryISOCode>${isoCode}</sCountryISOCode>
      </FullCountryInfo>`;
    
    const xml = await soapFetch('http://www.oorsprong.org/websamples.countryinfo/FullCountryInfo', buildSoapEnvelope(body));
    return xml.getElementsByTagName('m:FullCountryInfoResult')[0] || null;
  }

  // Get Currency Name
  async function getCurrencyName(currencyCode) {
    if (!currencyCode || currencyCode === 'N/A') return 'N/A';

    const body = `
      <CurrencyName xmlns="http://www.oorsprong.org/websamples.countryinfo">
        <sCurrencyISOCode>${currencyCode}</sCurrencyISOCode>
      </CurrencyName>`;

    try {
      const xml = await soapFetch('http://www.oorsprong.org/websamples.countryinfo/CurrencyName', buildSoapEnvelope(body));
      return xml.getElementsByTagName('m:CurrencyNameResult')[0]?.textContent || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  // Display Results
  function displayResults(info) {
    document.getElementById('countryName').textContent = info.name;
    document.getElementById('capitalCity').textContent = info.capital;
    document.getElementById('countryCode').textContent = info.isoCode;
    document.getElementById('currency').textContent = info.currencyName;
    document.getElementById('currencyCode').textContent = info.currencyCode;
    document.getElementById('phoneCode').textContent = info.phoneCode === 'N/A' ? 'N/A' : `+${info.phoneCode}`;
    document.getElementById('continent').textContent = info.continent;

    if (info.flag) {
      flagImg.src = info.flag;
      flagImg.alt = `Flag of ${info.name}`;
      flagImg.style.display = 'block';
    } else {
      flagImg.style.display = 'none';
    }

    resultsContainer.style.display = 'block';
    errorMessage.style.display = 'none';
  }

  // Show Error
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    resultsContainer.style.display = 'none';
  }

  // Main Function
  async function fetchCountryInfo() {
    const inputName = countryInput.value.trim().toLowerCase();
    const matchedCountry = countryList.find(c => c.toLowerCase() === inputName);

    if (!matchedCountry) {
      showError('Country not found in local list.');
      return;
    }

    loading.style.display = 'block';
    resultsContainer.style.display = 'none';
    errorMessage.style.display = 'none';

    try {
      const isoCode = await getCountryISOCode(matchedCountry);
      if (!isoCode) throw new Error('Country not found in API.');

      const countryXml = await getFullCountryInfo(isoCode);
      if (!countryXml) throw new Error('Failed to fetch country details.');

      const countryInfo = {
        name: countryXml.getElementsByTagName('m:sName')[0]?.textContent || 'N/A',
        capital: countryXml.getElementsByTagName('m:sCapitalCity')[0]?.textContent || 'N/A',
        phoneCode: countryXml.getElementsByTagName('m:sPhoneCode')[0]?.textContent || 'N/A',
        continent: countryXml.getElementsByTagName('m:sContinentCode')[0]?.textContent || 'N/A',
        currencyCode: countryXml.getElementsByTagName('m:sCurrencyISOCode')[0]?.textContent || 'N/A',
        isoCode: isoCode,
        // Flag from HTTPS source
        flag: `https://flagcdn.com/w320/${isoCode.toLowerCase()}.png`,
      };

      countryInfo.currencyName = await getCurrencyName(countryInfo.currencyCode);

      displayResults(countryInfo);
    } catch (error) {
      showError(error.message || 'An error occurred.');
    } finally {
      loading.style.display = 'none';
    }
  }
});
