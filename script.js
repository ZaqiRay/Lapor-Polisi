// Utility Functions
const Utils = {
    // Debounce function untuk optimasi performance
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Safe DOM element selector
    $: function(selector) {
        try {
            return document.querySelector(selector);
        } catch (error) {
            console.error('Selector error:', error);
            return null;
        }
    },
    
    // Safe DOM elements selector
    $$: function(selector) {
        try {
            return document.querySelectorAll(selector);
        } catch (error) {
            console.error('Selector error:', error);
            return [];
        }
    },

    // Copy to clipboard dengan fallback
    copyToClipboard: async function(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback untuk HTTP atau browser lama
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (error) {
            console.error('Copy failed:', error);
            return false;
        }
    },

    // Format phone number
    formatPhone: function(phone) {
        return phone.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    },

    // Validate email
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate phone
    validatePhone: function(phone) {
        const re = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
        return re.test(phone);
    }
};

// Mobile Menu Manager
class MobileMenu {
    constructor() {
        this.menuBtn = Utils.$('#mobileMenuBtn');
        this.menu = Utils.$('#mobileMenu');
        this.isOpen = false;
        this.init();
    }

    init() {
        if (!this.menuBtn || !this.menu) {
            console.warn('Mobile menu elements not found');
            return;
        }

        this.bindEvents();
    }

    bindEvents() {
        // Toggle menu
        this.menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Close menu when clicking on links
        Utils.$$('#mobileMenu a').forEach(link => {
            link.addEventListener('click', () => this.close());
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.menu.contains(e.target) && e.target !== this.menuBtn) {
                this.close();
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.menu.classList.add('active');
        this.menuBtn.textContent = '✕';
        this.menuBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        this.isOpen = true;

        // Announce to screen readers
        this.announce('Menu terbuka');
    }

    close() {
        this.menu.classList.remove('active');
        this.menuBtn.textContent = '☰';
        this.menuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        this.isOpen = false;

        // Announce to screen readers
        this.announce('Menu tertutup');
    }

    announce(message) {
        // Create aria-live region for screen readers
        let announcer = Utils.$('#aria-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'aria-announcer';
            announcer.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            document.body.appendChild(announcer);
        }
        announcer.textContent = message;
    }
}

// Form Handler
class LaporanForm {
    constructor() {
        this.form = Utils.$('#laporanForm');
        this.submitBtn = Utils.$('#laporanForm button[type="submit"]');
        this.originalBtnText = this.submitBtn?.textContent || 'Kirim Laporan';
        this.API_BASE = 'http://localhost:5000/api';
        this.init();
    }

    init() {
        if (!this.form) {
            console.warn('Laporan form not found');
            return;
        }

        this.bindEvents();
        this.setupRealTimeValidation();
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Reset form validation on input
        Utils.$$('.form-control').forEach(input => {
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    setupRealTimeValidation() {
        const debouncedValidate = Utils.debounce((input) => {
            this.validateField(input);
        }, 300);

        Utils.$$('.form-control').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', (e) => debouncedValidate(e.target));
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateForm()) {
            this.showError('Harap perbaiki kesalahan pada form sebelum mengirim.');
            return;
        }

        await this.submitForm();
    }

    validateForm() {
        let isValid = true;
        const errors = [];

        // Required fields validation
        const requiredFields = [
            { id: 'nama', name: 'Nama Lengkap' },
            { id: 'telepon', name: 'Nomor Telepon' },
            { id: 'jenisLaporan', name: 'Jenis Laporan' },
            { id: 'lokasi', name: 'Lokasi Kejadian' },
            { id: 'waktu', name: 'Waktu Kejadian' },
            { id: 'kronologi', name: 'Kronologi Kejadian' }
        ];

        requiredFields.forEach(field => {
            const element = Utils.$(`#${field.id}`);
            const value = element?.value.trim();
            
            if (!value) {
                isValid = false;
                errors.push(`${field.name} harus diisi`);
                this.showFieldError(element, `${field.name} harus diisi`);
            } else {
                this.clearFieldError(element);
            }
        });

        // Phone validation
        const telepon = Utils.$('#telepon')?.value.trim();
        if (telepon && !Utils.validatePhone(telepon)) {
            isValid = false;
            errors.push('Nomor telepon tidak valid. Format: 08xxxxxxxxxx');
            this.showFieldError(Utils.$('#telepon'), 'Nomor telepon tidak valid');
        }

        // Email validation (optional)
        const email = Utils.$('#email')?.value.trim();
        if (email && !Utils.validateEmail(email)) {
            isValid = false;
            errors.push('Format email tidak valid');
            this.showFieldError(Utils.$('#email'), 'Format email tidak valid');
        }

        // Description length validation
        const kronologi = Utils.$('#kronologi')?.value.trim();
        if (kronologi && kronologi.length < 50) {
            isValid = false;
            errors.push('Kronologi minimal 50 karakter');
            this.showFieldError(Utils.$('#kronologi'), 'Minimal 50 karakter');
        }

        // Time validation
        const waktuInput = Utils.$('#waktu')?.value;
        if (waktuInput) {
            const waktuKejadian = new Date(waktuInput);
            const sekarang = new Date();
            if (waktuKejadian > sekarang) {
                isValid = false;
                errors.push('Waktu kejadian tidak boleh lebih dari waktu sekarang');
                this.showFieldError(Utils.$('#waktu'), 'Waktu tidak valid');
            }
        }

        if (!isValid) {
            this.showError(`Harap perbaiki kesalahan berikut:\n\n${errors.join('\n')}`);
        }

        return isValid;
    }

    validateField(input) {
        const value = input.value.trim();
        const fieldName = input.getAttribute('name') || input.id;

        if (input.hasAttribute('required') && !value) {
            this.showFieldError(input, `${this.getFieldName(fieldName)} harus diisi`);
            return false;
        }

        switch (input.type) {
            case 'tel':
                if (value && !Utils.validatePhone(value)) {
                    this.showFieldError(input, 'Nomor telepon tidak valid');
                    return false;
                }
                break;
            case 'email':
                if (value && !Utils.validateEmail(value)) {
                    this.showFieldError(input, 'Format email tidak valid');
                    return false;
                }
                break;
        }

        // Special validation for specific fields
        if (input.id === 'kronologi' && value && value.length < 50) {
            this.showFieldError(input, 'Minimal 50 karakter');
            return false;
        }

        if (input.id === 'waktu' && value) {
            const waktuKejadian = new Date(value);
            const sekarang = new Date();
            if (waktuKejadian > sekarang) {
                this.showFieldError(input, 'Waktu tidak valid');
                return false;
            }
        }

        this.clearFieldError(input);
        return true;
    }

    showFieldError(element, message) {
        if (!element) return;

        element.style.borderColor = '#dc3545';
        element.setAttribute('aria-invalid', 'true');

        // Remove existing error message
        const existingError = element.parentNode.querySelector('.field-error');
        if (existingError) existingError.remove();

        // Add error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.cssText = `
            color: #dc3545;
            font-size: 0.875rem;
            margin-top: 5px;
        `;
        errorElement.textContent = message;
        element.parentNode.appendChild(errorElement);
    }

    clearFieldError(element) {
        if (!element) return;

        element.style.borderColor = '';
        element.removeAttribute('aria-invalid');

        const errorElement = element.parentNode.querySelector('.field-error');
        if (errorElement) errorElement.remove();
    }

    getFieldName(fieldId) {
        const names = {
            'nama': 'Nama Lengkap',
            'telepon': 'Nomor Telepon',
            'email': 'Email',
            'jenisLaporan': 'Jenis Laporan',
            'lokasi': 'Lokasi Kejadian',
            'waktu': 'Waktu Kejadian',
            'kronologi': 'Kronologi Kejadian'
        };
        return names[fieldId] || fieldId;
    }

    async submitForm() {
        this.setLoadingState(true);

        try {
            const formData = this.collectFormData();
            
            // Try backend first, then fallback to localStorage
            const success = await this.tryBackend(formData) || await this.saveToLocalStorage(formData);
            
            if (success) {
                this.showSuccess();
                this.resetForm();
            } else {
                throw new Error('Gagal menyimpan laporan');
            }
        } catch (error) {
            console.error('Submit error:', error);
            this.showError('Terjadi kesalahan saat mengirim laporan. Silakan coba lagi.');
        } finally {
            this.setLoadingState(false);
        }
    }

    collectFormData() {
        return {
            nama: Utils.$('#nama').value.trim(),
            telepon: Utils.$('#telepon').value.trim(),
            email: Utils.$('#email')?.value.trim() || '',
            jenisLaporan: Utils.$('#jenisLaporan').value,
            lokasiKejadian: Utils.$('#lokasi').value.trim(),
            waktuKejadian: Utils.$('#waktu').value,
            kronologi: Utils.$('#kronologi').value.trim(),
            timestamp: new Date().toISOString()
        };
    }

    async tryBackend(formData) {
        try {
            console.log('🔄 Mengirim ke backend...');
            
            const response = await fetch(`${this.API_BASE}/laporan/public`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                'Accept': 'application/json'
                },
                body: JSON.stringify(formData),
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Also save to localStorage as backup
                    await this.saveToLocalStorage({
                        ...formData,
                        nomorLaporan: result.data.laporan.nomorLaporan,
                        id: result.data.laporan._id,
                        status: 'menunggu',
                        source: 'backend'
                    }, false);
                    return true;
                }
            }
            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('⏰ Backend request timeout');
            } else {
                console.log('❌ Backend unavailable:', error.message);
            }
            return false;
        }
    }

    async saveToLocalStorage(formData, showAlert = true) {
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const nomorLaporan = 'LP' + Date.now().toString().slice(-6);
                    const laporanData = {
                        ...formData,
                        id: 'ls-' + Date.now(),
                        nomorLaporan: nomorLaporan,
                        status: 'menunggu',
                        source: 'localStorage',
                        createdAt: new Date().toISOString()
                    };

                    const existingData = JSON.parse(localStorage.getItem('laporanPolisi') || '[]');
                    existingData.push(laporanData);
                    localStorage.setItem('laporanPolisi', JSON.stringify(existingData));

                    console.log('💾 Saved to localStorage:', laporanData);
                    
                    if (showAlert) {
                        this.showLocalStorageSuccess(nomorLaporan);
                    }
                    
                    resolve(true);
                } catch (error) {
                    console.error('❌ LocalStorage error:', error);
                    resolve(false);
                }
            }, 1000);
        });
    }

    setLoadingState(loading) {
        if (!this.submitBtn) return;

        if (loading) {
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = 'Mengirim...';
            this.submitBtn.setAttribute('aria-busy', 'true');
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = this.originalBtnText;
            this.submitBtn.removeAttribute('aria-busy');
        }
    }

    showSuccess() {
        this.showMessage('Laporan berhasil dikirim!', 'success');
    }

    showLocalStorageSuccess(nomorLaporan) {
        this.showMessage(
            `Laporan berhasil dikirim! (Mode Simulasi)\n\nNomor Referensi: ${nomorLaporan}\n\nPetugas akan menghubungi Anda dalam waktu 1x24 jam.`,
            'warning'
        );
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type = 'info') {
        // Remove existing message
        const existingMsg = Utils.$('#formMessage');
        if (existingMsg) existingMsg.remove();

        const messageDiv = document.createElement('div');
        messageDiv.id = 'formMessage';
        messageDiv.style.cssText = `
            padding: 15px;
            margin: 15px 0;
            border-radius: 8px;
            text-align: center;
            font-weight: bold;
        `;

        const colors = {
            success: { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
            error: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
            warning: { bg: '#fff3cd', color: '#856404', border: '#ffeaa7' },
            info: { bg: '#cce7ff', color: '#004085', border: '#b3d7ff' }
        };

        const style = colors[type] || colors.info;
        messageDiv.style.background = style.bg;
        messageDiv.style.color = style.color;
        messageDiv.style.border = `1px solid ${style.border}`;

        messageDiv.textContent = message;
        this.form.insertBefore(messageDiv, this.submitBtn);

        // Auto remove after 8 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 8000);
    }

    resetForm() {
        this.form.reset();
        this.clearAllErrors();
        setCurrentDateTime();
    }

    clearAllErrors() {
        Utils.$$('.form-control').forEach(input => this.clearFieldError(input));
        const formMessage = Utils.$('#formMessage');
        if (formMessage) formMessage.remove();
    }
}

// Emergency Call Handler
class EmergencyCallHandler {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        Utils.$$('a[href^="tel:"]').forEach(link => {
            link.addEventListener('click', (e) => this.handleEmergencyCall(e, link));
        });
    }

    handleEmergencyCall(e, link) {
        const isMobile = this.isMobileDevice();
        const phoneNumber = link.getAttribute('href').replace('tel:', '');

        if (isMobile) {
            // Allow direct calling on mobile
            this.logEmergencyCall(phoneNumber);
            return true;
        }

        e.preventDefault();
        this.showDesktopEmergencyDialog(phoneNumber);
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    async showDesktopEmergencyDialog(phoneNumber) {
        const confirmed = await this.showConfirmationDialog(phoneNumber);
        
        if (confirmed) {
            await this.logEmergencyCall(phoneNumber);
            await this.showCallInstructions(phoneNumber);
            await Utils.copyToClipboard(phoneNumber);
        }
    }

    showConfirmationDialog(phoneNumber) {
        return new Promise((resolve) => {
            // Create custom dialog
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            const content = document.createElement('div');
            content.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            `;

            content.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 15px;">🚨</div>
                <h3 style="color: #dc3545; margin-bottom: 15px;">PANGGILAN DARURAT</h3>
                <p style="margin-bottom: 20px; line-height: 1.5;">
                    Anda akan menghubungi:<br>
                    <strong style="font-size: 1.2em;">${Utils.formatPhone(phoneNumber)}</strong>
                </p>
                <p style="color: #666; margin-bottom: 25px; font-size: 0.9em;">
                    Pastikan ini keadaan darurat sebelum melanjutkan.
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="confirmEmergency" style="
                        padding: 12px 24px;
                        background: #dc3545;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                    ">Hubungi</button>
                    <button id="cancelEmergency" style="
                        padding: 12px 24px;
                        background: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Batal</button>
                </div>
            `;

            dialog.appendChild(content);
            document.body.appendChild(dialog);

            // Handle button clicks
            Utils.$('#confirmEmergency').addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(true);
            });

            Utils.$('#cancelEmergency').addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(false);
            });

            // Close on backdrop click
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    document.body.removeChild(dialog);
                    resolve(false);
                }
            });
        });
    }

    async showCallInstructions(phoneNumber) {
        const copied = await Utils.copyToClipboard(phoneNumber);
        const copyMsg = copied ? 'Nomor telah disalin ke clipboard.' : 'Gagal menyalin nomor.';

        alert(`📞 PANGGILAN DARURAT\n\nSegera hubungi: ${Utils.formatPhone(phoneNumber)}\n\n${copyMsg}\n\nGunakan telepon Anda untuk menelepon nomor darurat ini.`);
    }

    logEmergencyCall(phoneNumber) {
        const logEntry = {
            phoneNumber: phoneNumber,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        console.log('🚨 Emergency call:', logEntry);

        // Save to localStorage for analytics
        try {
            const existingLogs = JSON.parse(localStorage.getItem('emergencyCalls') || '[]');
            existingLogs.push(logEntry);
            localStorage.setItem('emergencyCalls', JSON.stringify(existingLogs));
        } catch (error) {
            console.error('Failed to log emergency call:', error);
        }
    }
}

// Scroll Animations
class ScrollAnimations {
    constructor() {
        this.observer = null;
        this.init();
    }

    init() {
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver not supported');
            return;
        }

        this.setupObserver();
        this.observeElements();
    }

    setupObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateIn(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
    }

    observeElements() {
        const elementsToAnimate = Utils.$$('.service-card, .station-card, .help-card, .fade-in');
        
        elementsToAnimate.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            element.style.transitionDelay = `${index * 0.1}s`;
            
            this.observer.observe(element);
        });
    }

    animateIn(element) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }
}

// Main Application Controller
class LaporPolisiApp {
    constructor() {
        this.components = {};
        this.init();
    }

    init() {
        console.log('🚀 Initializing Lapor Polisi Application...');
        
        try {
            this.initializeComponents();
            this.setupGlobalErrorHandling();
            this.testBackendConnection();
            
            console.log('✅ Application initialized successfully!');
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
        }
    }

    initializeComponents() {
        // Initialize all components
        this.components = {
            mobileMenu: new MobileMenu(),
            laporanForm: new LaporanForm(),
            emergencyHandler: new EmergencyCallHandler(),
            scrollAnimations: new ScrollAnimations()
        };

        // Set current datetime
        setCurrentDateTime();
    }

    setupGlobalErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            e.preventDefault();
        });
    }

    async testBackendConnection() {
        try {
            const response = await fetch('http://localhost:5000/api/health', {
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                console.log('✅ Backend connected');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.log('⚠️ Backend offline - using localStorage mode');
        }
    }

    // Public methods for debugging
    debug() {
        return {
            components: this.components,
            localStorageData: JSON.parse(localStorage.getItem('laporanPolisi') || '[]'),
            emergencyCalls: JSON.parse(localStorage.getItem('emergencyCalls') || '[]')
        };
    }
}

// Utility Functions
function setCurrentDateTime() {
    const waktuInput = Utils.$('#waktu');
    if (waktuInput && !waktuInput.value) {
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        waktuInput.value = localDateTime;
    }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.LaporPolisiApp = new LaporPolisiApp();
    });
} else {
    window.LaporPolisiApp = new LaporPolisiApp();
}

// AbortSignal.timeout polyfill
if (!AbortSignal.timeout) {
    AbortSignal.timeout = function(ms) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(new DOMException('TimeoutError', 'TimeoutError')), ms);
        return controller.signal;
    };
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LaporPolisiApp, Utils };
}