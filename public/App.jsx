import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './App.css';

// ===== تعريف المستخدمين والصلاحيات =====
const USERS = {
    "5674": {
        name: "نصر العامري",
        role: "admin",
        permissions: {
            editK: true,  // عمود K (إيرادات أخرى)
            editL: true,  // عمود L (المسلم)
            editD: true,  // عمود D (قراءة حالية)
            editN: true,  // عمود N (ملاحظات)
            viewAll: true,
            export: true,
            backup: true,
            sync: true
        }
    },
    "6785": {
        name: "سليمان الفرزعي",
        role: "cashier",
        permissions: {
            editK: true,
            editL: true,
            editD: false,
            editN: true,
            viewAll: true,
            export: true,
            backup: false,
            sync: true
        }
    },
    "3452": {
        name: "يوسف الحجاجي",
        role: "accountant",
        permissions: {
            editK: false,
            editL: false,
            editD: false,
            editN: false,
            viewAll: true,
            export: true,
            backup: false,
            sync: false
        }
    },
    "4562": {
        name: "قارئ العداد",
        role: "reader",
        permissions: {
            editK: false,
            editL: false,
            editD: true,
            editN: true,
            viewAll: true,
            export: false,
            backup: false,
            sync: true
        }
    }
};

// ===== واجهات القرى الثمانية =====
const villageAPIs = {
    "السوفعي": "https://script.google.com/macros/s/AKfycbxwk4kUq6iKrILZZj97hoHw4x8oJLTcJW_imP3J7LloQBR79DDlY31AAcRRHytcJNon/exec",
    "العليا": "https://script.google.com/macros/s/AKfycbwxfCWbufmKMvNZXzmuK6PqbmUSH7px3HmIQcJl2Am8vM5FCCNZHQ_kIrTBbzdDe6-aMQ/exec",
    "السفلى": "https://script.google.com/macros/s/AKfycbwrtgwr8WYMlNcQzj3qCF6-OvAei6EFK_e2LzuMLAfc4WDVlguqdCOzdF9gTWh8mYA/exec",
    "الشعابي": "https://script.google.com/macros/s/AKfycbyAcUuicFALQFVgMjc7TSCmZ1lzCzoMFjHOZy2q-nlZv2nq0bCY77-0BpY7U2zFRWJ2AA/exec",
    "الجبل": "https://script.google.com/macros/s/AKfycbzr81y7Am5rC4VGOwwzFDpACNzIe9sE9DW9zy1SFy4HNSOrWs4gshHBlCCCXKYnPFFC/exec",
    "حيزان": "https://script.google.com/macros/s/AKfycbyZZ5AAuEineNuWWMsMYJaqTcsH7KA8l2Xov6AC_qJn4uAFhNRxRW1A1icCVYlH79bK/exec",
    "رقش": "https://script.google.com/macros/s/AKfycbxMD6WXWvALfYxuCre5On3yS1u7HqxxdjYUqVF8s1KfNgcQTqKQXQ3DxbEh0RHX08gA/exec",
    "الضرفه": "https://script.google.com/macros/s/AKfycbzgjurHK5GQX43r7aqP_365sL-2CQksnwqlkdYP03pcZLna-6it60FfpcQ0TasMAG0/exec"
};

// ===== تعريفات الأعمدة =====
const COLUMN_HEADERS = [
    { letter: "A", icon: "fas fa-hashtag", label: "رقم العداد", col: 0, width: "80px" },
    { letter: "B", icon: "fas fa-user", label: "الاسم", col: 1, width: "200px" },
    { letter: "C", icon: "fas fa-tachometer-alt", label: "قراءة سابقة", col: 2 },
    { letter: "D", icon: "fas fa-tachometer-alt", label: "قراءة حالية", col: 3, editable: true, validation: 'reading' },
    { letter: "E", icon: "fas fa-cube", label: "الاستهلاك (1-8م³)", col: 4 },
    { letter: "F", icon: "fas fa-cube", label: "الاستهلاك (9م³ فأكثر)", col: 5 },
    { letter: "G", icon: "fas fa-dollar-sign", label: "قيمة الاستهلاك", col: 6 },
    { letter: "H", icon: "fas fa-home", label: "رسوم ثابتة", col: 7 },
    { letter: "I", icon: "fas fa-calendar-alt", label: "متأخرات سابقة", col: 8 },
    { letter: "J", icon: "fas fa-funnel-dollar", label: "الإجمالي المطلوب", col: 9 },
    { letter: "K", icon: "fas fa-hand-holding-usd", label: "إيرادات أخرى", col: 10, editable: true, validation: 'paid' },
    { letter: "L", icon: "fas fa-money-check-alt", label: "المسلم", col: 11, editable: true, validation: 'paid' },
    { letter: "M", icon: "fas fa-receipt", label: "المتبقي", col: 12 },
    { letter: "N", icon: "fas fa-sticky-note", label: "ملاحظات", col: 13, editable: true, validation: 'text' },
];

const MONTHS = [
    "شهر 1", "شهر 2", "شهر 3", "شهر 4", "شهر 5", 
    "شهر 6", "شهر 7", "شهر 8", "شهر 9", "شهر 10", 
    "شهر 11", "شهر 12"
];

// ===== نظام الذاكرة الذكية =====
class IntelligentMemoryManager {
    constructor() {
        this.prefs = this.loadPreferences();
        this.cache = this.loadCache();
        this.learningRate = 0.1;
        this.maxCacheSize = 100;
        this.lastCleanup = Date.now();
    }

    loadPreferences() {
        try {
            const saved = localStorage.getItem('smartMemoryPrefs');
            return saved ? JSON.parse(saved) : this.getDefaultPreferences();
        } catch (error) {
            console.error('Error loading preferences:', error);
            return this.getDefaultPreferences();
        }
    }

    loadCache() {
        try {
            const saved = localStorage.getItem('smartMemoryCache');
            return saved ? JSON.parse(saved) : this.getDefaultCache();
        } catch (error) {
            console.error('Error loading cache:', error);
            return this.getDefaultCache();
        }
    }

    getDefaultPreferences() {
        return {
            userHabits: {},
            villageUsage: {},
            monthUsage: {},
            searchHistory: {},
            editPatterns: {},
            uiPreferences: {
                defaultView: 'table',
                theme: 'light',
                fontSize: 'medium',
                density: 'comfortable'
            },
            shortcuts: {},
            predictiveSuggestions: {},
            lastUpdated: Date.now()
        };
    }

    getDefaultCache() {
        return {
            villageData: {},
            userSuggestions: {},
            searchResults: {},
            calculatedTotals: {},
            frequentOperations: {},
            temporalData: {
                hourly: {},
                daily: {},
                weekly: {}
            },
            lastUpdated: Date.now()
        };
    }

    savePreferences() {
        try {
            this.prefs.lastUpdated = Date.now();
            localStorage.setItem('smartMemoryPrefs', JSON.stringify(this.prefs));
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    saveCache() {
        try {
            this.cache.lastUpdated = Date.now();
            localStorage.setItem('smartMemoryCache', JSON.stringify(this.cache));
        } catch (error) {
            console.error('Error saving cache:', error);
        }
    }

    updateUserHabits(userId, action, context = {}) {
        if (!this.prefs.userHabits[userId]) {
            this.prefs.userHabits[userId] = {
                actions: {},
                frequency: {},
                lastActions: {},
                searchHistory: [],
                frequentSearches: []
            };
        }

        const userHabits = this.prefs.userHabits[userId];
        
        if (!userHabits.actions[action]) {
            userHabits.actions[action] = { count: 0, contexts: [] };
        }
        userHabits.actions[action].count++;
        userHabits.actions[action].contexts.push({
            ...context,
            timestamp: Date.now()
        });

        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        
        if (!userHabits.frequency[hour]) userHabits.frequency[hour] = 0;
        userHabits.frequency[hour]++;
        
        userHabits.lastActions[action] = Date.now();

        this.savePreferences();
    }

    updateVillageUsage(villageName, dataSize = 0) {
        if (!this.prefs.villageUsage[villageName]) {
            this.prefs.villageUsage[villageName] = {
                accessCount: 0,
                lastAccess: Date.now(),
                averageDataSize: 0,
                accessTimes: []
            };
        }

        const village = this.prefs.villageUsage[villageName];
        village.accessCount++;
        village.lastAccess = Date.now();
        village.accessTimes.push(Date.now());
        
        village.averageDataSize = (village.averageDataSize * (village.accessCount - 1) + dataSize) / village.accessCount;

        this.savePreferences();
    }

    cacheVillageData(villageName, month, data) {
        const cacheKey = `${villageName}_${month}`;
        
        this.cache.villageData[cacheKey] = {
            data: data,
            timestamp: Date.now(),
            size: JSON.stringify(data).length,
            accessCount: (this.cache.villageData[cacheKey]?.accessCount || 0) + 1
        };

        const now = new Date();
        const hourKey = `${now.getHours()}:00`;
        const dayKey = now.toISOString().split('T')[0];
        
        if (!this.cache.temporalData.hourly[hourKey]) {
            this.cache.temporalData.hourly[hourKey] = 0;
        }
        this.cache.temporalData.hourly[hourKey]++;

        if (!this.cache.temporalData.daily[dayKey]) {
            this.cache.temporalData.daily[dayKey] = 0;
        }
        this.cache.temporalData.daily[dayKey]++;

        this.cleanupCache();
        this.saveCache();
    }

    getCachedVillageData(villageName, month, maxAge = 3600000) {
        const cacheKey = `${villageName}_${month}`;
        const cached = this.cache.villageData[cacheKey];
        
        if (cached && Date.now() - cached.timestamp < maxAge) {
            cached.accessCount++;
            this.recordTemporalAccess();
            this.saveCache();
            return cached.data;
        }
        
        return null;
    }

    recordTemporalAccess() {
        const now = new Date();
        const weekKey = `week_${Math.floor(now.getDate() / 7)}`;
        
        if (!this.cache.temporalData.weekly[weekKey]) {
            this.cache.temporalData.weekly[weekKey] = 0;
        }
        this.cache.temporalData.weekly[weekKey]++;
    }

    cleanupCache() {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        Object.keys(this.cache.villageData).forEach(key => {
            if (now - this.cache.villageData[key].timestamp > oneDay) {
                delete this.cache.villageData[key];
            }
        });

        Object.keys(this.cache.temporalData.hourly).forEach(key => {
            const [hour] = key.split(':');
            const hourDiff = Math.abs(parseInt(hour) - new Date().getHours());
            if (hourDiff > 24) {
                delete this.cache.temporalData.hourly[key];
            }
        });

        const cacheKeys = Object.keys(this.cache.villageData);
        if (cacheKeys.length > this.maxCacheSize) {
            const sortedKeys = cacheKeys.sort((a, b) => {
                return this.cache.villageData[a].accessCount - this.cache.villageData[b].accessCount;
            });
            
            const toRemove = sortedKeys.slice(0, cacheKeys.length - this.maxCacheSize);
            toRemove.forEach(key => {
                delete this.cache.villageData[key];
            });
        }

        this.lastCleanup = now;
    }

    getSmartSuggestions(userId, currentContext) {
        const userHabits = this.prefs.userHabits[userId];
        if (!userHabits) return [];

        const suggestions = [];
        const now = new Date();
        const currentHour = now.getHours();

        const villageUsage = this.prefs.villageUsage;
        const lastUsedVillage = Object.entries(villageUsage)
            .sort((a, b) => b[1].lastAccess - a[1].lastAccess)[0];
        
        if (lastUsedVillage) {
            suggestions.push({
                type: 'village',
                message: `آخر قرية استخدمتها: ${lastUsedVillage[0]}`,
                action: () => ({ village: lastUsedVillage[0] })
            });
        }

        const frequentActions = Object.entries(userHabits.actions)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 3);
        
        frequentActions.forEach(([action, data]) => {
            if (action !== currentContext.action) {
                suggestions.push({
                    type: 'action',
                    message: `غالباً تقوم بـ: ${this.translateAction(action)}`,
                    action: () => ({ action: action })
                });
            }
        });

        if (userHabits.frequency[currentHour] > 0) {
            suggestions.push({
                type: 'time',
                message: `هذا الوقت مناسب لـ: ${this.getTimeBasedSuggestion(currentHour)}`,
                action: () => ({})
            });
        }

        return suggestions;
    }

    translateAction(action) {
        const translations = {
            'search': 'البحث عن مشتركين',
            'edit': 'تعديل البيانات',
            'export': 'تصدير التقارير',
            'view': 'عرض البيانات',
            'filter': 'تصفية النتائج'
        };
        return translations[action] || action;
    }

    getTimeBasedSuggestion(hour) {
        if (hour >= 8 && hour <= 12) {
            return 'تحديث بيانات الصباح';
        } else if (hour >= 14 && hour <= 18) {
            return 'مراجعة المتأخرين';
        } else if (hour >= 19 && hour <= 22) {
            return 'إنشاء التقارير';
        } else {
            return 'النسخ الاحتياطي';
        }
    }

    getMemoryPerformance() {
        const cacheSize = Object.keys(this.cache.villageData).length;
        const cacheHitRate = this.calculateCacheHitRate();
        const memoryUsage = this.calculateMemoryUsage();
        const suggestionsAccuracy = this.calculateSuggestionsAccuracy();

        return {
            cacheSize,
            cacheHitRate,
            memoryUsage: `${(memoryUsage / 1024).toFixed(2)} KB`,
            suggestionsAccuracy: `${(suggestionsAccuracy * 100).toFixed(1)}%`,
            lastCleanup: new Date(this.lastCleanup).toLocaleString('ar-SA'),
            temporalPatterns: this.analyzeTemporalPatterns()
        };
    }

    calculateCacheHitRate() {
        const totalAccesses = Object.values(this.cache.villageData)
            .reduce((sum, item) => sum + item.accessCount, 0);
        
        const cacheHits = Object.values(this.cache.villageData)
            .filter(item => item.accessCount > 1)
            .reduce((sum, item) => sum + (item.accessCount - 1), 0);
        
        return totalAccesses > 0 ? (cacheHits / totalAccesses) * 100 : 0;
    }

    calculateMemoryUsage() {
        const prefsSize = JSON.stringify(this.prefs).length;
        const cacheSize = JSON.stringify(this.cache).length;
        return prefsSize + cacheSize;
    }

    calculateSuggestionsAccuracy() {
        return 0.75;
    }

    analyzeTemporalPatterns() {
        const hourly = this.cache.temporalData.hourly;
        const daily = this.cache.temporalData.daily;
        
        const peakHour = Object.entries(hourly)
            .sort((a, b) => b[1] - a[1])[0];
        
        const peakDay = Object.entries(daily)
            .sort((a, b) => b[1] - a[1])[0];

        return {
            peakHour: peakHour ? `${peakHour[0]} (${peakHour[1]} عملية)` : 'لا توجد بيانات',
            peakDay: peakDay ? `${peakDay[0]} (${peakDay[1]} عملية)` : 'لا توجد بيانات',
            totalOperations: Object.values(hourly).reduce((a, b) => a + b, 0)
        };
    }

    clearCache() {
        this.cache = this.getDefaultCache();
        this.saveCache();
    }

    clearPreferences() {
        this.prefs = this.getDefaultPreferences();
        this.savePreferences();
    }
}

const memoryManager = new IntelligentMemoryManager();

// ===== نظام التحقق الذكي للقراءات =====
const validateReading = (prevReading, currentReading) => {
    if (isNaN(prevReading) || isNaN(currentReading)) {
        return {
            isValid: false,
            type: 'invalid_numbers',
            message: 'القيم المدخلة يجب أن تكون أرقاماً صحيحة'
        };
    }
    
    if (currentReading < prevReading) {
        return {
            isValid: false,
            type: 'reading_decreased',
            message: `خطأ: القراءة الحالية (${currentReading}) أقل من السابقة (${prevReading})`
        };
    }
    
    const maxAllowed = prevReading + 30;
    if (currentReading > maxAllowed) {
        return {
            isValid: false,
            type: 'excessive_consumption',
            message: `تحذير: الاستهلاك (${currentReading - prevReading}) يزيد عن الحد المسموح (30)`
        };
    }
    
    const consumption = currentReading - prevReading;
    
    if (consumption === 0) {
        return {
            isValid: true,
            type: 'no_consumption',
            message: 'ملاحظة: لم يتم تسجيل استهلاك هذا الشهر'
        };
    }
    
    if (consumption <= 5) {
        return {
            isValid: true,
            type: 'low_consumption',
            message: 'استهلاك منخفض'
        };
    }
    
    if (consumption > 20) {
        return {
            isValid: true,
            type: 'high_consumption_warning',
            message: 'تحذير: استهلاك مرتفع، قد يحتاج فحص'
        };
    }
    
    return {
        isValid: true,
        type: 'normal_consumption',
        message: 'القراءة مقبولة'
    };
};

// ===== دالة مساعدة لتنسيق الأرقام =====
const formatNumber = (value, currency = false, colIndex = -1) => {
    if (value === null || value === undefined || value === "") return "";
    
    const cleanValue = String(value).replace(/,/g, '').trim();
    const num = parseFloat(cleanValue);
    if (isNaN(num)) return value;
    
    if (colIndex === 3 || colIndex === 11 || colIndex === 10) {
        if ((colIndex === 11 || colIndex === 10) && num === 0) return "";
        if (colIndex === 3 && num === 0) return "0";
        return num.toFixed(0).replace(/,/g, '');
    }
    
    const needsDecimal = (colIndex >= 4 && colIndex <= 12) || (num % 1 !== 0);
    const fractionDigits = needsDecimal ? 2 : 0;
    
    return num.toLocaleString('en-US', {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
    });
};

// ===== مكون بطاقة المشترك للموبايل =====
const MobileSubscriberCard = ({ subscriber, index, onEdit, userPermissions, startVoiceInput, addNotification }) => {
    const [id, name, prevReading, currentReading, cons1, cons2, 
           consValue, fixedFee, lateBalance, totalRequired, 
           otherRevenue, paidAmount, remaining, notes] = subscriber;
    
    const isLate = (parseFloat(remaining) || 0) > 5000;
    const canEditPaid = userPermissions?.editL || false;
    const canEditReading = userPermissions?.editD || false;
    const canEditOtherRevenue = userPermissions?.editK || false;
    const canEditNotes = userPermissions?.editN || false;
    
    const validateAndEdit = (rowIndex, colIndex, newValue) => {
        if (colIndex === 3) {
            const prev = parseFloat(prevReading) || 0;
            const current = parseFloat(newValue) || 0;
            
            const validation = validateReading(prev, current);
            
            if (!validation.isValid) {
                addNotification(validation.message, 'error');
                return;
            }
            
            if (validation.type === 'excessive_consumption' || validation.type === 'high_consumption_warning') {
                addNotification(validation.message, 'warning');
            }
        }
        
        onEdit(rowIndex, colIndex, newValue);
    };
    
    return (
        <div className={`mobile-card ${isLate ? 'late-card' : ''}`}>
            <div className="mobile-card-header">
                <div className="card-id-section">
                    <span className="meter-id">
                        <i className="fas fa-hashtag"></i> {id || '---'}
                    </span>
                    <span className="card-index">#{index + 1}</span>
                </div>
                
                {isLate && (
                    <div className="late-badge">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>متأخر</span>
                    </div>
                )}
            </div>
            
            <div className="subscriber-name-section">
                <i className="fas fa-user"></i>
                <h3>{name || 'بدون اسم'}</h3>
            </div>
            
            <div className="card-section">
                <h4><i className="fas fa-tachometer-alt"></i> قراءة العداد</h4>
                <div className="reading-row">
                    <div className="reading-item">
                        <span>السابقة:</span>
                        <strong>{prevReading || '0'}</strong>
                    </div>
                    <div className="reading-item">
                        <span>الحالية:</span>
                        {canEditReading ? (
                            <div className="editable-cell-with-mic">
                                <input
                                    type="number"
                                    value={currentReading || ''}
                                    onChange={(e) => validateAndEdit(index, 3, e.target.value)}
                                    className="editable-input"
                                    placeholder="أدخل القراءة"
                                    min={prevReading || 0}
                                    max={(parseFloat(prevReading) || 0) + 30}
                                />
                                <button 
                                    className="cell-microphone-btn"
                                    onClick={() => startVoiceInput(index, 3)}
                                    title="إدخال صوتي للقراءة"
                                    type="button"
                                >
                                    <i className="fas fa-microphone"></i>
                                </button>
                                {(currentReading || prevReading) && (
                                    <div className="reading-validation-hint">
                                        <i className={`fas fa-${
                                            currentReading >= prevReading && currentReading <= (parseFloat(prevReading) || 0) + 30 ? 
                                            'check-circle valid' : 'exclamation-circle invalid'
                                        }`}></i>
                                        <span>المسموح: {prevReading || 0} - {(parseFloat(prevReading) || 0) + 30}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <strong>{currentReading || '0'}</strong>
                        )}
                    </div>
                </div>
                <div className="consumption-row">
                    <i className="fas fa-tint"></i>
                    <span>الاستهلاك: {cons1 || 0} + {cons2 || 0} = {consValue || 0} م³</span>
                </div>
            </div>
            
            <div className="card-section">
                <h4><i className="fas fa-money-bill-wave"></i> الحالة المالية</h4>
                
                {canEditOtherRevenue && (
                    <div className="financial-item">
                        <span>إيرادات أخرى:</span>
                        <div className="editable-cell-with-mic">
                            <input
                                type="number"
                                value={otherRevenue || ''}
                                onChange={(e) => onEdit(index, 10, e.target.value)}
                                className="editable-input"
                                placeholder="المبلغ الإضافي"
                            />
                            <button 
                                className="cell-microphone-btn"
                                onClick={() => startVoiceInput(index, 10)}
                                title="إدخال صوتي للإيرادات"
                                type="button"
                            >
                                <i className="fas fa-microphone"></i>
                            </button>
                        </div>
                    </div>
                )}
                
                <div className="financial-item">
                    <span>المطلوب:</span>
                    <strong className="required-amount">{formatNumber(totalRequired, true)}</strong>
                </div>
                
                <div className="financial-item">
                    <span>المسلم:</span>
                    {canEditPaid ? (
                        <div className="editable-cell-with-mic">
                            <input
                                type="number"
                                value={paidAmount || ''}
                                onChange={(e) => onEdit(index, 11, e.target.value)}
                                className="editable-input paid-input"
                                placeholder="المبلغ المسدد"
                            />
                            <button 
                                className="cell-microphone-btn"
                                onClick={() => startVoiceInput(index, 11)}
                                title="إدخال صوتي للمبلغ المسدد"
                                type="button"
                            >
                                <i className="fas fa-microphone"></i>
                            </button>
                        </div>
                    ) : (
                        <strong className="paid-amount">{formatNumber(paidAmount, true)}</strong>
                    )}
                </div>
                
                <div className="financial-item">
                    <span>المتبقي:</span>
                    <strong className={`remaining-amount ${isLate ? 'late' : ''}`}>
                        {formatNumber(remaining, true)}
                    </strong>
                </div>
            </div>
            
            {(notes || canEditNotes) && (
                <div className="card-section">
                    <h4><i className="fas fa-sticky-note"></i> ملاحظات</h4>
                    {canEditNotes ? (
                        <div className="notes-with-mic">
                            <textarea
                                value={notes || ''}
                                onChange={(e) => onEdit(index, 13, e.target.value)}
                                className="notes-input"
                                placeholder="أضف ملاحظة..."
                                rows="2"
                            />
                            <button 
                                className="notes-microphone-btn"
                                onClick={() => startVoiceInput(index, 13)}
                                title="إدخال صوتي للملاحظات"
                                type="button"
                            >
                                <i className="fas fa-microphone"></i>
                            </button>
                        </div>
                    ) : (
                        <p className="notes-text">{notes || 'لا توجد ملاحظات'}</p>
                    )}
                </div>
            )}
            
            <div className="payment-status">
                <div className={`status-dot ${isLate ? 'late' : 'paid'}`}></div>
                <span>{isLate ? 'متأخر في السداد' : 'حالة الدفع جيدة'}</span>
            </div>
        </div>
    );
};

// ===== نظام البحث الذكي المتطور (النسخة الكاملة والمعدلة) =====
const SmartSearchSystem = ({ searchTerm, setSearchTerm, filters, setFilters, village, villages, user, memoryManager, onSearch, addNotification }) => {
    const [showFilters, setShowFilters] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [showSearchHistory, setShowSearchHistory] = useState(false);
    const [selectedVillageForSearch, setSelectedVillageForSearch] = useState(village);
    const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);
    
    const recognitionRef = useRef(null);
    const searchInputRef = useRef(null);
    
    // مزامنة القرية المختارة عند تغييرها من الخارج
    useEffect(() => {
        setSelectedVillageForSearch(village);
    }, [village]);

    // تحميل سجل البحث من الذاكرة الذكية
    useEffect(() => {
        if (memoryManager && user) {
            const userHabits = memoryManager.prefs.userHabits[user.name];
            if (userHabits && userHabits.searchHistory) {
                setSearchHistory(userHabits.searchHistory.slice(-10));
            }
        }
    }, [memoryManager, user]);

    // --- الجوهر: دالة تحليل الصوت والبحث المركب ---
    const analyzeVoiceResults = (transcript) => {
        let text = transcript.trim();
        let detectedVillage = null;
        let cleanedName = text;

        // قائمة القرى المتاحة (من مفاتيح الـ API في كودك)
        const villageList = Object.keys(villages); 
        
        // كلمات وصل شائعة في لهجتنا (مثل: ذي رقش، من حيزان)
        const connectors = ['ذي', 'من', 'في', 'بقرية', 'قرية', 'بيت', 'عن'];

        // 1. اكتشاف إذا كان المستخدم ذكر اسم قرية في كلامه
        villageList.forEach(vName => {
            if (text.includes(vName)) {
                detectedVillage = vName;
                
                // 2. تنظيف النص: إزالة اسم القرية من الجملة
                cleanedName = cleanedName.replace(vName, "");
                
                // 3. إزالة كلمات الوصل ليبقى اسم الشخص صافياً
                connectors.forEach(word => {
                    const regex = new RegExp(`\\b${word}\\b`, 'g');
                    cleanedName = cleanedName.replace(regex, "");
                });
            }
        });

        // تنظيف المسافات الزائدة
        cleanedName = cleanedName.trim();

        // 4. تحليل أوامر إضافية (مثل: المتأخرين)
        const specialFilters = {};
        if (text.includes('متأخر') || text.includes('دين')) specialFilters.paymentStatus = 'late';
        if (text.includes('مسدد')) specialFilters.paymentStatus = 'paid';

        return { 
            cleanedName, 
            detectedVillage, 
            specialFilters 
        };
    };

    // تهيئة التعرف الصوتي
    const initSpeechRecognition = useCallback(() => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            addNotification('المتصفح لا يدعم البحث الصوتي', 'error');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'ar-SA';
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onstart = () => {
            setIsListening(true);
            setIsVoiceSearchActive(true);
            addNotification('تحدث الآن (مثلاً: محمد أحمد ذي رقش)', 'info');
        };

        recognitionRef.current.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const { cleanedName, detectedVillage, specialFilters } = analyzeVoiceResults(transcript);
            
            // تنفيذ البحث بناءً على التحليل
            if (detectedVillage) {
                setSelectedVillageForSearch(detectedVillage);
                const finalSearch = cleanedName || "";
                handleSmartSearch(finalSearch, detectedVillage, specialFilters);
                addNotification(`تم توجيه البحث لقرية ${detectedVillage}`, 'success');
            } else {
                handleSmartSearch(transcript, selectedVillageForSearch, specialFilters);
            }
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
            setIsVoiceSearchActive(false);
        };
    }, [villages, selectedVillageForSearch, filters]);

    const startVoiceSearch = () => {
        if (!recognitionRef.current) initSpeechRecognition();
        try { recognitionRef.current.start(); } catch (e) { console.error(e); }
    };

    const handleSmartSearch = (query, targetVillage = null, extraFilters = {}) => {
        const finalVillage = targetVillage || selectedVillageForSearch;
        setSearchTerm(query);
        
        // دمج الفلاتر المكتشفة صوتياً مع الفلاتر الحالية
        const finalFilters = { ...filters, ...extraFilters };
        if (Object.keys(extraFilters).length > 0) setFilters(finalFilters);

        if (onSearch) {
            onSearch({
                searchTerm: query,
                village: finalVillage,
                filters: finalFilters
            });
        }
    };

    return (
        <div className="smart-search-system">
            <div className="search-bar-container">
                <div className="search-main-bar">
                    <div className="village-selector-search">
                        <select 
                            value={selectedVillageForSearch}
                            onChange={(e) => {
                                setSelectedVillageForSearch(e.target.value);
                                handleSmartSearch(searchTerm, e.target.value);
                            }}
                            className="village-search-select"
                        >
                            <option value="all">كل القرى</option>
                            {Object.keys(villages).map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="search-input-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch(searchTerm)}
                            placeholder="ابحث بالاسم أو استخدم الميكروفون المركب..."
                            className="smart-search-input"
                        />
                        
                        <div className="search-action-buttons">
                            {searchTerm && (
                                <button onClick={() => {setSearchTerm(''); handleSmartSearch('');}} className="search-clear-btn">
                                    <i className="fas fa-times"></i>
                                </button>
                            )}
                            <button 
                                onClick={startVoiceSearch}
                                className={`voice-search-btn ${isListening ? 'listening' : ''}`}
                                title="بحث صوتي مركب"
                            >
                                <i className={`fas ${isListening ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                            </button>
                            <button 
                                onClick={() => setShowFilters(!showFilters)}
                                className="advanced-filters-toggle"
                            >
                                <i className="fas fa-sliders-h"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* مؤشر الاستماع */}
                {isVoiceSearchActive && (
                    <div className="voice-search-indicator">
                        <div className="voice-animation">
                            <div className="voice-bar"></div>
                            <div className="voice-bar"></div>
                            <div className="voice-bar"></div>
                        </div>
                        <span>جاري معالجة الصوت ذكياً...</span>
                    </div>
                )}
                
                {/* المرشحات المتقدمة */}
                {showFilters && (
                    <div className="advanced-filters-panel">
                        <div className="filters-grid">
                            <div className="filter-group">
                                <label>حالة الدفع:</label>
                                <select 
                                    value={filters.paymentStatus}
                                    onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
                                >
                                    <option value="all">الكل</option>
                                    <option value="late">المتأخرين فقط</option>
                                    <option value="paid">المسددين فقط</option>
                                    <option value="partial">المسددين جزئياً</option>
                                </select>
                            </div>
                            
                            <div className="filter-group">
                                <label>المبلغ المتبقي:</label>
                                <div className="amount-range">
                                    <input
                                        type="number"
                                        placeholder="من"
                                        value={filters.remainingMin}
                                        onChange={(e) => setFilters({...filters, remainingMin: e.target.value})}
                                        className="range-input"
                                    />
                                    <span>إلى</span>
                                    <input
                                        type="number"
                                        placeholder="إلى"
                                        value={filters.remainingMax}
                                        onChange={(e) => setFilters({...filters, remainingMax: e.target.value})}
                                        className="range-input"
                                    />
                                </div>
                            </div>
                            
                            <div className="filter-group">
                                <label>نوع الاستهلاك:</label>
                                <select 
                                    value={filters.consumptionType}
                                    onChange={(e) => setFilters({...filters, consumptionType: e.target.value})}
                                >
                                    <option value="all">الكل</option>
                                    <option value="high">استهلاك عالي</option>
                                    <option value="low">استهلاك منخفض</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="filters-actions">
                            <button 
                                className="apply-filters-btn"
                                onClick={() => {
                                    handleSmartSearch(searchTerm);
                                    setShowFilters(false);
                                }}
                            >
                                <i className="fas fa-check"></i> تطبيق المرشحات
                            </button>
                            
                            <button 
                                className="clear-filters-btn"
                                onClick={() => {
                                    setFilters({
                                        paymentStatus: 'all',
                                        remainingMin: '',
                                        remainingMax: '',
                                        consumptionType: 'all'
                                    });
                                    setShowFilters(false);
                                }}
                            >
                                <i className="fas fa-times"></i> مسح الكل
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* أوامر صوتية سريعة كدليل للمستخدم */}
            <div className="quick-voice-commands">
                <span className="hint-text">جرب قول: "محمد أحمد ذي رقش" أو "المتأخرين في السوفعي"</span>
            </div>
        </div>
    );
};

// ===== مكون لوحة الذاكرة الذكية =====
const SmartMemoryPanel = ({ memoryManager, userId }) => {
    const [showPanel, setShowPanel] = useState(false);
    const [performance, setPerformance] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [cacheStats, setCacheStats] = useState(null);

    useEffect(() => {
        if (showPanel) {
            updatePanelData();
        }
    }, [showPanel]);

    const updatePanelData = () => {
        setPerformance(memoryManager.getMemoryPerformance());
        setSuggestions(memoryManager.getSmartSuggestions(userId, {}));
        setCacheStats({
            villageCount: Object.keys(memoryManager.cache.villageData).length,
            totalCachedItems: Object.keys(memoryManager.cache).length
        });
    };

    const handleClearCache = () => {
        memoryManager.clearCache();
        updatePanelData();
    };

    const handleClearPreferences = () => {
        memoryManager.clearPreferences();
        updatePanelData();
    };

    return (
        <div className="smart-memory-container">
            <button 
                className="memory-panel-toggle"
                onClick={() => setShowPanel(!showPanel)}
            >
                <i className="fas fa-brain"></i>
                الذاكرة الذكية
            </button>

            {showPanel && (
                <div className="memory-panel">
                    <div className="panel-header">
                        <h3><i className="fas fa-microchip"></i> لوحة الذاكرة الذكية</h3>
                        <button onClick={() => setShowPanel(false)} className="close-panel">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    <div className="panel-content">
                        <div className="performance-section">
                            <h4><i className="fas fa-chart-line"></i> أداء الذاكرة</h4>
                            {performance && (
                                <div className="performance-grid">
                                    <div className="performance-item">
                                        <span>حجم الكاش:</span>
                                        <strong>{performance.cacheSize} عنصر</strong>
                                    </div>
                                    <div className="performance-item">
                                        <span>نسبة نجاح الكاش:</span>
                                        <strong>{performance.cacheHitRate.toFixed(1)}%</strong>
                                    </div>
                                    <div className="performance-item">
                                        <span>استخدام الذاكرة:</span>
                                        <strong>{performance.memoryUsage}</strong>
                                    </div>
                                    <div className="performance-item">
                                        <span>دقة الاقتراحات:</span>
                                        <strong>{performance.suggestionsAccuracy}</strong>
                                    </div>
                                    <div className="performance-item">
                                        <span>آخر تنظيف:</span>
                                        <strong>{performance.lastCleanup}</strong>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="patterns-section">
                            <h4><i className="fas fa-clock"></i> الأنماط الزمنية</h4>
                            {performance && performance.temporalPatterns && (
                                <div className="patterns-grid">
                                    <div className="pattern-item">
                                        <i className="fas fa-hourglass-half"></i>
                                        <div>
                                            <span>ساعة الذروة:</span>
                                            <strong>{performance.temporalPatterns.peakHour}</strong>
                                        </div>
                                    </div>
                                    <div className="pattern-item">
                                        <i className="fas fa-calendar-day"></i>
                                        <div>
                                            <span>يوم الذروة:</span>
                                            <strong>{performance.temporalPatterns.peakDay}</strong>
                                        </div>
                                    </div>
                                    <div className="pattern-item">
                                        <i className="fas fa-calculator"></i>
                                        <div>
                                            <span>إجمالي العمليات:</span>
                                            <strong>{performance.temporalPatterns.totalOperations}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="suggestions-section">
                            <h4><i className="fas fa-lightbulb"></i> اقتراحات ذكية</h4>
                            {suggestions.length > 0 ? (
                                <div className="suggestions-list">
                                    {suggestions.map((suggestion, index) => (
                                        <div key={index} className="suggestion-item">
                                            <i className={`fas ${
                                                suggestion.type === 'village' ? 'fa-village' :
                                                suggestion.type === 'action' ? 'fa-running' :
                                                suggestion.type === 'time' ? 'fa-clock' : 'fa-info-circle'
                                            }`}></i>
                                            <span>{suggestion.message}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-suggestions">لا توجد اقتراحات حالياً</p>
                            )}
                        </div>

                        <div className="cache-section">
                            <h4><i className="fas fa-database"></i> إحصائيات التخزين</h4>
                            {cacheStats && (
                                <div className="cache-stats">
                                    <div className="stat-item">
                                        <i className="fas fa-map-marked-alt"></i>
                                        <div>
                                            <span>القرى المخزنة:</span>
                                            <strong>{cacheStats.villageCount}</strong>
                                        </div>
                                    </div>
                                    <div className="stat-item">
                                        <i className="fas fa-boxes"></i>
                                        <div>
                                            <span>إجمالي العناصر:</span>
                                            <strong>{cacheStats.totalCachedItems}</strong>
                                        </div>
                                    </div>
                                    <div className="stat-item">
                                        <i className="fas fa-history"></i>
                                        <div>
                                            <span>آخر تحديث:</span>
                                            <strong>{new Date(memoryManager.cache.lastUpdated).toLocaleTimeString('ar-SA')}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="controls-section">
                            <h4><i className="fas fa-tools"></i> أدوات الذاكرة</h4>
                            <div className="controls-grid">
                                <button onClick={handleClearCache} className="control-btn danger">
                                    <i className="fas fa-trash"></i> مسح الكاش
                                </button>
                                <button onClick={handleClearPreferences} className="control-btn danger">
                                    <i className="fas fa-user-slash"></i> مسح التفضيلات
                                </button>
                                <button onClick={updatePanelData} className="control-btn">
                                    <i className="fas fa-sync-alt"></i> تحديث البيانات
                                </button>
                                <button onClick={() => memoryManager.cleanupCache()} className="control-btn">
                                    <i className="fas fa-broom"></i> تنظيف الذاكرة
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===== مكون مراقبة القراءات الذكية =====
const SmartReadingMonitor = ({ data, onAnomalyDetected, addNotification }) => {
    const [anomalies, setAnomalies] = useState([]);
    const [statistics, setStatistics] = useState({});
    
    useEffect(() => {
        if (data && data.length > 3) {
            analyzeReadings();
        }
    }, [data]);
    
    const analyzeReadings = () => {
        const subscriberData = data.slice(2, data.length - 1);
        let totalReadings = 0;
        let validReadings = 0;
        let suspiciousReadings = 0;
        let zeroConsumption = 0;
        let highConsumption = 0;
        
        const detectedAnomalies = [];
        
        subscriberData.forEach(row => {
            totalReadings++;
            const prev = parseFloat(row[2]) || 0;
            const current = parseFloat(row[3]) || 0;
            
            if (current >= prev && current <= prev + 30) {
                validReadings++;
                
                const consumption = current - prev;
                
                if (consumption === 0) {
                    zeroConsumption++;
                    if (prev > 0) {
                        detectedAnomalies.push({
                            meterId: row[0],
                            type: 'zero_consumption',
                            details: `العداد ${row[0]} - ${row[1]}: صفر استهلاك هذه الدورة`,
                            severity: 'medium'
                        });
                    }
                }
                
                if (consumption > 20) {
                    highConsumption++;
                    detectedAnomalies.push({
                        meterId: row[0],
                        type: 'high_consumption',
                        details: `العداد ${row[0]} - ${row[1]}: استهلاك مرتفع (${consumption} وحدة)`,
                        severity: 'high'
                    });
                }
                
            } else {
                suspiciousReadings++;
                detectedAnomalies.push({
                    meterId: row[0],
                    type: 'invalid_reading',
                    details: `العداد ${row[0]} - ${row[1]}: قراءة غير منطقية (${prev} → ${current})`,
                    severity: 'critical'
                });
            }
        });
        
        setStatistics({
            totalReadings,
            validReadings,
            suspiciousReadings,
            validityRate: totalReadings > 0 ? (validReadings / totalReadings * 100).toFixed(1) : 0,
            zeroConsumption,
            highConsumption
        });
        
        setAnomalies(detectedAnomalies);
        
        if (detectedAnomalies.length > 0 && onAnomalyDetected) {
            onAnomalyDetected(detectedAnomalies);
        }
        
        if (suspiciousReadings > 0 && addNotification) {
            addNotification(`تم اكتشاف ${suspiciousReadings} قراءة مشبوهة`, 'warning');
        }
    };
    
    return (
        <div className="smart-reading-monitor">
            <div className="monitor-header">
                <h3><i className="fas fa-search"></i> مراقب القراءات الذكي</h3>
                <span className={`status-indicator ${
                    (statistics.validityRate || 0) >= 95 ? 'excellent' :
                    (statistics.validityRate || 0) >= 80 ? 'good' : 'poor'
                }`}>
                    {statistics.validityRate || 0}% صحة
                </span>
            </div>
            
            {statistics.totalReadings > 0 && (
                <div className="reading-stats">
                    <div className="stat-row">
                        <div className="stat-item">
                            <i className="fas fa-check-circle"></i>
                            <span>قراءات صحيحة:</span>
                            <strong>{statistics.validReadings}</strong>
                        </div>
                        <div className="stat-item">
                            <i className="fas fa-exclamation-triangle"></i>
                            <span>مشبوهة:</span>
                            <strong className="warning">{statistics.suspiciousReadings}</strong>
                        </div>
                    </div>
                    
                    <div className="stat-row">
                        <div className="stat-item">
                            <i className="fas fa-ban"></i>
                            <span>صفر استهلاك:</span>
                            <strong>{statistics.zeroConsumption}</strong>
                        </div>
                        <div className="stat-item">
                            <i className="fas fa-chart-line"></i>
                            <span>استهلاك عالي:</span>
                            <strong>{statistics.highConsumption}</strong>
                        </div>
                    </div>
                </div>
            )}
            
            {anomalies.length > 0 && (
                <div className="anomalies-section">
                    <h4><i className="fas fa-radar"></i> تنبيهات الشذوذ ({anomalies.length})</h4>
                    <div className="anomalies-list">
                        {anomalies.slice(0, 5).map((anomaly, index) => (
                            <div key={index} className={`anomaly-item ${anomaly.severity}`}>
                                <i className={`fas ${
                                    anomaly.severity === 'critical' ? 'fa-fire' :
                                    anomaly.severity === 'high' ? 'fa-exclamation-circle' :
                                    'fa-info-circle'
                                }`}></i>
                                <div className="anomaly-details">
                                    <strong>{anomaly.type}</strong>
                                    <p>{anomaly.details}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {anomalies.length > 5 && (
                        <div className="more-anomalies">
                            <i className="fas fa-ellipsis-h"></i>
                            <span>و {anomalies.length - 5} تنبيه إضافي</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ===== المكون الرئيسي مع نظام البحث الذكي المركب =====
const App = () => {
    // ===== الحالات الرئيسية =====
    const [user, setUser] = useState(null);
    const [village, setVillage] = useState("السوفعي");
    const [month, setMonth] = useState(MONTHS[0]);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    // ===== حالات البحث المتقدم =====
    const [searchTerm, setSearchTerm] = useState('');
    const [searchFilters, setSearchFilters] = useState({
        paymentStatus: 'all',
        remainingMin: '',
        remainingMax: '',
        consumptionType: 'all'
    });
    const [isMobileView, setIsMobileView] = useState(false);
    
    // ===== المقاييس =====
    const [metrics, setMetrics] = useState({
        totalHighConsumption: 0,
        totalConsumption: 0,
        totalPaid: 0,
        totalRequired: 0,
        totalRemaining: 0,
        collectionRate: 0,
        totalSubscribers: 0,
        lastUpdated: ''
    });
    
    // ===== الحالات الإضافية =====
    const [theme, setTheme] = useState('light');
    const [offlineMode, setOfflineMode] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showAlerts, setShowAlerts] = useState(false);
    const [showAIReport, setShowAIReport] = useState(false);
    const [activeFeature, setActiveFeature] = useState('dashboard');
    const [isOnline, setIsOnline] = useState(true);
    const [pendingSyncs, setPendingSyncs] = useState([]);
    const [showMemoryPanel, setShowMemoryPanel] = useState(false);
    
    // ===== المراجع =====
    const searchRef = useRef(null);
    const speechRecognitionRef = useRef(null);
    const [isListeningCell, setIsListeningCell] = useState(false);
    const [currentEditingCell, setCurrentEditingCell] = useState({ row: -1, col: -1 });
    
    // ===== تهيئة التعرف الصوتي =====
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            speechRecognitionRef.current = new SpeechRecognition();
            speechRecognitionRef.current.lang = 'ar-SA';
            speechRecognitionRef.current.interimResults = false;
            speechRecognitionRef.current.continuous = false;
            
            speechRecognitionRef.current.onstart = () => {
                setIsListeningCell(true);
                addNotification('جاري الاستماع... تحدث الآن', 'info');
            };
            
            speechRecognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (currentEditingCell.row >= 0 && currentEditingCell.col >= 0) {
                    handleCellEdit(currentEditingCell.row, currentEditingCell.col, transcript);
                    addNotification('تم التعرف على النص: ' + transcript, 'success');
                }
                setIsListeningCell(false);
            };
            
            speechRecognitionRef.current.onerror = (error) => {
                console.error('خطأ في التعرف الصوتي:', error);
                setIsListeningCell(false);
                addNotification('حدث خطأ في التعرف الصوتي', 'error');
            };
            
            speechRecognitionRef.current.onend = () => {
                setIsListeningCell(false);
                setCurrentEditingCell({ row: -1, col: -1 });
            };
        } else {
            console.warn('ميزة التعرف الصوتي غير مدعومة في هذا المتصفح');
        }
        
        return () => {
            if (speechRecognitionRef.current) {
                speechRecognitionRef.current.stop();
            }
        };
    }, [currentEditingCell]);
    
    // ===== وظيفة بدء الإدخال الصوتي للخلايا =====
    const startVoiceInput = (rowIndex, colIndex) => {
        if (!speechRecognitionRef.current) {
            addNotification('ميزة التعرف الصوتي غير مدعومة في متصفحك', 'error');
            return;
        }
        
        if (!canEditCell(colIndex)) {
            addNotification('ليس لديك صلاحية لتعديل هذا الحقل', 'warning');
            return;
        }
        
        setCurrentEditingCell({ row: rowIndex, col: colIndex });
        
        try {
            speechRecognitionRef.current.start();
        } catch (error) {
            console.error('خطأ في بدء التعرف الصوتي:', error);
            addNotification('تعذر بدء التعرف الصوتي', 'error');
        }
    };
    
    // ===== اكتشاف حجم الشاشة =====
    useEffect(() => {
        const checkMobile = () => {
            setIsMobileView(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    // ===== تأثيرات جانبية =====
    useEffect(() => {
        setIsOnline(navigator.onLine);
        window.addEventListener('online', () => setIsOnline(true));
        window.addEventListener('offline', () => setIsOnline(false));
        
        const savedUser = localStorage.getItem('waterAppUser');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error('خطأ في تحميل بيانات المستخدم:', e);
            }
        }
        
        if (user) {
            loadData();
        }
        
        if (user && village) {
            memoryManager.updateVillageUsage(village);
            memoryManager.updateUserHabits(user.name, 'select_village', { village, month });
        }
        
        return () => {
            window.removeEventListener('online', () => setIsOnline(true));
            window.removeEventListener('offline', () => setIsOnline(false));
        };
    }, [user, village, month]);
    
    // ===== فلترة البيانات مع البحث المتقدم =====
    useEffect(() => {
        filterData();
    }, [searchTerm, searchFilters, data]);
    
    // ===== وظائف النظام الأساسية =====
    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    };
    
    // ===== نظام الدخول =====
    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        
        if (USERS[password]) {
            const loggedUser = USERS[password];
            setUser(loggedUser);
            localStorage.setItem('waterAppUser', JSON.stringify(loggedUser));
            
            memoryManager.updateUserHabits(loggedUser.name, 'login', { time: new Date().toLocaleTimeString() });
            
            addNotification(`مرحباً بك ${loggedUser.name}`, 'success');
        } else {
            setError('كود المستخدم غير صحيح');
            addNotification('كود المستخدم غير صحيح', 'error');
        }
    };
    
    const handleLogout = () => {
        if (user) {
            memoryManager.updateUserHabits(user.name, 'logout', { time: new Date().toLocaleTimeString() });
        }
        setUser(null);
        localStorage.removeItem('waterAppUser');
        addNotification('تم تسجيل الخروج', 'info');
    };
    
    // ===== جلب البيانات مع الذاكرة الذكية =====
    const loadData = async (forceRefresh = false) => {
        if (!user) return;
        
        setLoading(true);
        try {
            let rawData = null;
            
            if (!forceRefresh) {
                const cachedData = memoryManager.getCachedVillageData(village, month);
                if (cachedData) {
                    rawData = cachedData;
                    addNotification('تم تحميل البيانات من الذاكرة الذكية', 'info');
                    
                    memoryManager.updateUserHabits(user.name, 'load_cached', { village, month });
                }
            }
            
            if (!rawData) {
                if (offlineMode) {
                    const savedData = localStorage.getItem(`offlineData_${village}_${month}`);
                    if (savedData) {
                        rawData = JSON.parse(savedData);
                        addNotification('عرض البيانات المحفوظة محلياً', 'info');
                    } else {
                        throw new Error('لا توجد بيانات محفوظة محلياً');
                    }
                } else if (isOnline) {
                    const apiUrl = villageAPIs[village];
                    const response = await fetch(`${apiUrl}?sheet=${encodeURIComponent(month)}&t=${Date.now()}`);
                    
                    if (!response.ok) {
                        throw new Error('فشل الاتصال بالسيرفر');
                    }
                    
                    rawData = await response.json();
                    
                    memoryManager.cacheVillageData(village, month, rawData);
                    
                    memoryManager.updateUserHabits(user.name, 'load_server', { village, month, size: JSON.stringify(rawData).length });
                    
                    addNotification('تم تحديث البيانات من السيرفر', 'success');
                } else {
                    throw new Error('غير متصل بالإنترنت');
                }
            }
            
            if (rawData && Array.isArray(rawData)) {
                setData(rawData);
                calculateMetrics(rawData);
                
                setMetrics(prev => ({
                    ...prev,
                    lastUpdated: new Date().toLocaleTimeString('ar-SA')
                }));
            }
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
            addNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    // ===== حساب المقاييس =====
    const calculateMetrics = (dataToCalculate) => {
        if (!dataToCalculate || dataToCalculate.length < 3) {
            setMetrics({
                totalHighConsumption: 0,
                totalConsumption: 0,
                totalPaid: 0,
                totalRequired: 0,
                totalRemaining: 0,
                collectionRate: 0,
                totalSubscribers: 0,
                lastUpdated: metrics.lastUpdated
            });
            return;
        }
        
        const subscriberData = dataToCalculate.slice(2, dataToCalculate.length - 1);
        const newMetrics = {
            totalHighConsumption: 0,
            totalConsumption: 0,
            totalPaid: 0,
            totalRequired: 0,
            totalRemaining: 0,
            totalSubscribers: subscriberData.length,
            lastUpdated: metrics.lastUpdated
        };
        
        subscriberData.forEach(row => {
            const highConsumption = parseFloat(row[5]) || 0;
            const consumption1 = parseFloat(row[4]) || 0;
            const consumption2 = parseFloat(row[5]) || 0;
            
            newMetrics.totalHighConsumption += highConsumption;
            newMetrics.totalConsumption += consumption1 + consumption2;
            newMetrics.totalRequired += parseFloat(row[9]) || 0;
            newMetrics.totalPaid += parseFloat(row[11]) || 0;
            newMetrics.totalRemaining += parseFloat(row[12]) || 0;
        });
        
        newMetrics.collectionRate = newMetrics.totalRequired > 0 
            ? (newMetrics.totalPaid / newMetrics.totalRequired) * 100 
            : 0;
        
        setMetrics(newMetrics);
    };
    
    // ===== فلترة البيانات مع البحث المتقدم =====
    const filterData = () => {
        if (!data || data.length < 3) {
            setFilteredData([]);
            return;
        }
        
        let filtered = data.slice(2, data.length - 1);
        
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(row => {
                const meterId = String(row[0] || '').toLowerCase();
                const name = String(row[1] || '').toLowerCase();
                const notes = String(row[13] || '').toLowerCase();
                
                return meterId.includes(term) || 
                       name.includes(term) || 
                       notes.includes(term);
            });
        }
        
        if (searchFilters.paymentStatus !== 'all') {
            filtered = filtered.filter(row => {
                const remaining = parseFloat(row[12]) || 0;
                const paid = parseFloat(row[11]) || 0;
                const required = parseFloat(row[9]) || 0;
                
                switch(searchFilters.paymentStatus) {
                    case 'late':
                        return remaining > 5000;
                    case 'paid':
                        return remaining <= 0;
                    case 'partial':
                        return paid > 0 && remaining > 0;
                    default:
                        return true;
                }
            });
        }
        
        if (searchFilters.remainingMin || searchFilters.remainingMax) {
            filtered = filtered.filter(row => {
                const remaining = parseFloat(row[12]) || 0;
                const min = parseFloat(searchFilters.remainingMin) || 0;
                const max = parseFloat(searchFilters.remainingMax) || Infinity;
                
                return remaining >= min && remaining <= max;
            });
        }
        
        if (searchFilters.consumptionType !== 'all') {
            filtered = filtered.filter(row => {
                const consumption = (parseFloat(row[4]) || 0) + (parseFloat(row[5]) || 0);
                
                switch(searchFilters.consumptionType) {
                    case 'high':
                        return consumption > 50;
                    case 'low':
                        return consumption < 5;
                    default:
                        return true;
                }
            });
        }
        
        setFilteredData([data[0], data[1], ...filtered, data[data.length - 1]]);
    };
    
    // ===== تحرير الخلايا مع الذاكرة الذكية والتحقق الذكي =====
    const canEditCell = (colIndex) => {
        if (!user || offlineMode) return false;
        
        switch(colIndex) {
            case 3: return user.permissions.editD;
            case 10: return user.permissions.editK;
            case 11: return user.permissions.editL;
            case 13: return user.permissions.editN;
            default: return false;
        }
    };
    
    const recalculateRow = (row, updatedColIndex, updatedValue) => {
        const cleanValue = parseFloat(updatedValue) || 0;
        const prevReading = parseFloat(row[2]) || 0;
        const currentReading = parseFloat(row[3]) || 0;
        
        if (updatedColIndex === 3) {
            const validationResult = validateReading(prevReading, currentReading);
            
            if (!validationResult.isValid) {
                row[3] = row[2];
                addNotification(validationResult.message, 'error');
                
                if (user) {
                    memoryManager.updateUserHabits(user.name, 'invalid_reading_attempt', {
                        village,
                        month,
                        meterId: row[0],
                        prevReading,
                        attemptedReading: currentReading,
                        reason: validationResult.type
                    });
                }
                return;
            }
            
            const consumption = Math.max(0, currentReading - prevReading);
            let consF1 = 0, consF2 = 0;
            
            if (consumption > 0) {
                if (consumption <= 8) {
                    consF1 = consumption;
                } else {
                    consF1 = 8;
                    consF2 = consumption - 8;
                }
            }
            
            const valueF1 = consF1 * 200;
            const valueF2 = consF2 * 400;
            
            row[4] = consF1.toFixed(2);
            row[5] = consF2.toFixed(2);
            row[6] = (valueF1 + valueF2).toFixed(2);
            
            if (user) {
                memoryManager.updateUserHabits(user.name, 'reading_update_success', {
                    village,
                    month,
                    meterId: row[0],
                    prevReading,
                    newReading: currentReading,
                    consumption
                });
            }
        }
        
        const totalConsumption = parseFloat(row[6]) || 0;
        const fixedFee = parseFloat(row[7]) || 500;
        const lateBalance = parseFloat(row[8]) || 0;
        const otherRevenue = parseFloat(row[10]) || 0;
        const paidAmount = parseFloat(row[11]) || 0;
        
        row[9] = (totalConsumption + fixedFee + lateBalance + otherRevenue).toFixed(2);
        row[12] = (parseFloat(row[9]) - paidAmount).toFixed(2);
    };
    
    const handleCellEdit = async (rowIndex, colIndex, newValue) => {
        if (!canEditCell(colIndex)) {
            addNotification('ليس لديك صلاحية لتعديل هذا الحقل', 'warning');
            return;
        }
        
        const actualIndex = rowIndex + 2;
        const newData = [...data];
        newData[actualIndex][colIndex] = newValue;
        
        if (colIndex === 3 || colIndex === 11 || colIndex === 10) {
            recalculateRow(newData[actualIndex], colIndex, newValue);
        }
        
        setData(newData);
        calculateMetrics(newData);
        
        localStorage.setItem(`offlineData_${village}_${month}`, JSON.stringify(newData));
        
        memoryManager.cacheVillageData(village, month, newData);
        
        memoryManager.updateUserHabits(user.name, 'edit_cell', {
            village,
            month,
            row: actualIndex,
            column: COLUMN_HEADERS[colIndex]?.label || `Column ${colIndex}`,
            oldValue: data[actualIndex][colIndex],
            newValue
        });
        
        if (isOnline && user.permissions.sync) {
            addSyncTask(actualIndex, colIndex, newValue);
        }
        
        addNotification('تم حفظ التعديل', 'success');
    };
    
    // ===== نظام المزامنة =====
    const addSyncTask = (row, col, value) => {
        const colLetter = String.fromCharCode(65 + col);
        const task = {
            id: Date.now(),
            village,
            month,
            row,
            col: colLetter,
            value,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };
        
        setPendingSyncs(prev => [...prev, task]);
        addNotification('تمت إضافة مهمة مزامنة', 'info');
    };
    
    // ===== إذا لم يكن مسجل دخول =====
    if (!user) {
        return (
            <div className={`login-screen ${theme}`}>
                <div className="login-container">
                    <div className="login-logo">
                        <i className="fas fa-water"></i>
                        <h1>نظام إدارة مياه السوفعي</h1>
                        <p>الإصدار المتقدم | نظام آمن يعمل بدون اتصال</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="login-input-group">
                            <label htmlFor="passwordInput">أدخل كود المستخدم:</label>
                            <input
                                type="password"
                                id="passwordInput"
                                className="login-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="أدخل كود المستخدم (4 أرقام)"
                                maxLength="4"
                                pattern="[0-9]*"
                                required
                            />
                        </div>
                        
                        {error && (
                            <div className="login-error show">
                                <i className="fas fa-exclamation-circle"></i>
                                <span>{error}</span>
                            </div>
                        )}
                        
                        <button type="submit" className="login-btn">
                            <i className="fas fa-sign-in-alt"></i> دخول للنظام
                        </button>
                    </form>
                    
                    <div className="developer-info">
                        <span>تصميم وإعداد وتنفيذ</span>
                        <strong>نصر العامري</strong>
                    </div>
                </div>
            </div>
        );
    }
    
    // ===== الواجهة الرئيسية =====
    return (
        <div className={`app-container ${theme}`}>
            {/* الإشعارات */}
            <div className="notifications-container">
                {notifications.map(notif => (
                    <div key={notif.id} className={`notification ${notif.type}`}>
                        <i className={`fas ${
                            notif.type === 'success' ? 'fa-check-circle' :
                            notif.type === 'error' ? 'fa-times-circle' :
                            notif.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'
                        }`}></i>
                        <span>{notif.message}</span>
                    </div>
                ))}
            </div>
            
            {/* مؤشر الاستماع الصوتي */}
            {isListeningCell && (
                <div className="voice-input-active">
                    <div className="mic-animation">
                        <i className="fas fa-microphone"></i>
                    </div>
                    <h3>جاري الاستماع...</h3>
                    <p>تحدث الآن لإدخال القيمة صوتياً</p>
                    <div className="voice-input-hint">
                        <i className="fas fa-lightbulb"></i>
                        <span>يمكنك قول الأرقام بالعربية أو الإنجليزية</span>
                    </div>
                </div>
            )}
            
            {/* الشريط العلوي */}
            <header className="main-header">
                <div className="header-left">
                    <div className="logo">
                        <i className="fas fa-water"></i>
                        <h2>مشروع السوفعي</h2>
                    </div>
                    
                    <div className="user-info">
                        <div className="user-avatar">
                            <i className="fas fa-user-circle"></i>
                        </div>
                        <div className="user-details">
                            <h3>{user.name}</h3>
                            <span className="user-role">
                                {user.role === "admin" ? "مدير النظام" : 
                                 user.role === "cashier" ? "أمين الصندوق" :
                                 user.role === "accountant" ? "محاسب" : "قارئ العداد"}
                            </span>
                        </div>
                        <button onClick={handleLogout} className="logout-btn">
                            <i className="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </div>
                
                <div className="header-right">
                    <div className="status-indicator">
                        <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
                        <span>{isOnline ? 'متصل' : 'غير متصل'}</span>
                    </div>
                    
                    <button onClick={() => setOfflineMode(!offlineMode)} 
                            className={`offline-toggle ${offlineMode ? 'active' : ''}`}>
                        <i className={`fas ${offlineMode ? 'fa-wifi-slash' : 'fa-wifi'}`}></i>
                        {offlineMode ? 'غير متصل' : 'متصل'}
                    </button>
                    
                    {/* لوحة الذاكرة الذكية */}
                    <SmartMemoryPanel 
                        memoryManager={memoryManager}
                        userId={user.name}
                    />
                    
                    <button onClick={toggleTheme} className="theme-toggle">
                        <i className={`fas ${
                            theme === 'dark' ? 'fa-sun' : 
                            theme === 'high-contrast' ? 'fa-adjust' : 'fa-moon'
                        }`}></i>
                    </button>
                </div>
            </header>
            
            {/* المحتوى الرئيسي */}
            <div className="dashboard-layout">
                {/* الشريط الجانبي */}
                <aside className="sidebar">
                    <div className="feature-tabs">
                        <button 
                            className={`tab-button ${activeFeature === 'dashboard' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveFeature('dashboard');
                                memoryManager.updateUserHabits(user.name, 'switch_tab', { tab: 'dashboard' });
                            }}
                        >
                            <i className="fas fa-tachometer-alt"></i> لوحة التحكم
                        </button>
                        <button 
                            className={`tab-button ${activeFeature === 'monthly-report' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveFeature('monthly-report');
                                memoryManager.updateUserHabits(user.name, 'switch_tab', { tab: 'monthly-report' });
                            }}
                        >
                            <i className="fas fa-chart-line"></i> تقرير القرى
                        </button>
                    </div>
                    
                    <div className="control-group">
                        <label htmlFor="villageSelect">اختيار القرية</label>
                        <select 
                            id="villageSelect"
                            value={village}
                            onChange={(e) => {
                                setVillage(e.target.value);
                                memoryManager.updateUserHabits(user.name, 'select_village', { 
                                    village: e.target.value, 
                                    previous: village 
                                });
                            }}
                        >
                            {Object.keys(villageAPIs).map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="control-group">
                        <label htmlFor="monthSelect">اختيار الشهر</label>
                        <select 
                            id="monthSelect"
                            value={month}
                            onChange={(e) => {
                                setMonth(e.target.value);
                                memoryManager.updateUserHabits(user.name, 'select_month', { 
                                    month: e.target.value, 
                                    previous: month 
                                });
                            }}
                        >
                            {MONTHS.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    
                    <button onClick={() => {
                        loadData();
                        memoryManager.updateUserHabits(user.name, 'refresh_data', { village, month });
                    }} 
                    className="action-btn" 
                    disabled={loading}>
                        <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                        تحديث البيانات
                    </button>
                    
                    <button onClick={() => {
                        setShowAIReport(!showAIReport);
                        memoryManager.updateUserHabits(user.name, 'toggle_ai_report', { 
                            state: !showAIReport 
                        });
                    }} 
                    className="action-btn ai-btn">
                        <i className="fas fa-robot"></i>
                        تحليل ذكي
                    </button>
                    
                    <button onClick={() => {
                        setShowAlerts(!showAlerts);
                        memoryManager.updateUserHabits(user.name, 'toggle_alerts', { 
                            state: !showAlerts 
                        });
                    }} 
                    className={`action-btn ${showAlerts ? 'active' : ''}`}>
                        <i className="fas fa-bell"></i>
                        التنبيهات
                    </button>
                    
                    <div className="sidebar-footer">
                        <button onClick={() => {
                            exportData('excel');
                            memoryManager.updateUserHabits(user.name, 'export_data', { format: 'excel', village, month });
                        }} 
                        className="footer-btn">
                            <i className="fas fa-file-export"></i> تصدير
                        </button>
                        <button onClick={() => {
                            createBackup();
                            memoryManager.updateUserHabits(user.name, 'create_backup', { village, month });
                        }} 
                        className="footer-btn">
                            <i className="fas fa-database"></i> نسخ احتياطي
                        </button>
                    </div>
                </aside>
                
                {/* المحتوى الرئيسي */}
                <main className="main-content">
                    {/* محتوى لوحة التحكم */}
                    {activeFeature === 'dashboard' && (
                        <div id="dashboard-content">
                            <div className="header-section">
                                <h1>لوحة معلومات المشتركين - {village}</h1>
                                
                                {/* نظام البحث الذكي المركب */}
                                <SmartSearchSystem
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    filters={searchFilters}
                                    setFilters={setSearchFilters}
                                    village={village}
                                    villages={villageAPIs}
                                    user={user}
                                    memoryManager={memoryManager}
                                    onSearch={(searchParams) => {
                                        setSearchTerm(searchParams.searchTerm);
                                        setSearchFilters(prev => ({ ...prev, ...searchParams.filters }));
                                        
                                        if (searchParams.village && searchParams.village !== village) {
                                            setVillage(searchParams.village);
                                        }
                                    }}
                                    addNotification={addNotification}
                                />
                            </div>
                            
                            {/* مراقب القراءات الذكية */}
                            <SmartReadingMonitor 
                                data={filteredData}
                                onAnomalyDetected={(anomalies) => {
                                    if (anomalies.length > 0) {
                                        addNotification(`تم اكتشاف ${anomalies.length} قراءة غير طبيعية`, 'warning');
                                        
                                        if (user) {
                                            memoryManager.updateUserHabits(user.name, 'anomalies_detected', {
                                                count: anomalies.length,
                                                village,
                                                month,
                                                types: [...new Set(anomalies.map(a => a.type))]
                                            });
                                        }
                                    }
                                }}
                                addNotification={addNotification}
                            />
                            
                            {/* تقرير الذكاء الاصطناعي */}
                            {showAIReport && (
                                <div className="ai-analysis-section">
                                    <h2><i className="fas fa-brain"></i> تقرير التحليل الذكي</h2>
                                    <div className="ai-content">
                                        <h3>ملخص أداء {village} لـ {month}</h3>
                                        <p>عدد المشتركين: <strong>{filteredData.length > 2 ? filteredData.length - 3 : 0}</strong></p>
                                        <p>معدل التحصيل: <strong>{metrics.collectionRate.toFixed(2)}%</strong></p>
                                        <p>إجمالي المتبقي: <strong>{formatNumber(metrics.totalRemaining, true)} ر.س</strong></p>
                                        <p>المشتركين المتأخرين: <strong>
                                            {filteredData.filter((row, idx) => idx >= 2 && idx < filteredData.length - 1 && (parseFloat(row[12]) || 0) > 5000).length}
                                        </strong></p>
                                        
                                        <div className="smart-suggestions">
                                            <h4><i className="fas fa-lightbulb"></i> اقتراحات بناءً على أنماط الاستخدام:</h4>
                                            {memoryManager.getSmartSuggestions(user.name, { action: 'view_report' }).slice(0, 3).map((suggestion, index) => (
                                                <div key={index} className="suggestion-item">
                                                    <i className="fas fa-chevron-left"></i>
                                                    <span>{suggestion.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* لوحة المقاييس */}
                            <div className="key-metrics">
                                <div className="metric-card">
                                    <div className="metric-info">
                                        <h3><i className="fas fa-fire"></i> استهلاك عالي (م³)</h3>
                                        <p>{formatNumber(metrics.totalHighConsumption)}</p>
                                    </div>
                                    <i className="metric-icon fas fa-bell"></i>
                                </div>
                                
                                <div className="metric-card">
                                    <div className="metric-info">
                                        <h3><i className="fas fa-tint"></i> إجمالي الاستهلاك (م³)</h3>
                                        <p>{formatNumber(metrics.totalConsumption)}</p>
                                    </div>
                                    <i className="metric-icon fas fa-chart-line"></i>
                                </div>
                                
                                <div className="metric-card paid-metric">
                                    <div className="metric-info">
                                        <h3><i className="fas fa-wallet"></i> إجمالي المسلّم</h3>
                                        <p>{formatNumber(metrics.totalPaid, true)}</p>
                                    </div>
                                    <i className="metric-icon fas fa-money-check-alt"></i>
                                </div>
                                
                                <div className="metric-card">
                                    <div className="metric-info">
                                        <h3><i className="fas fa-coins"></i> الإجمالي المطلوب</h3>
                                        <p>{formatNumber(metrics.totalRequired, true)}</p>
                                    </div>
                                    <i className="metric-icon fas fa-hand-holding-usd"></i>
                                </div>
                                
                                <div className="metric-card">
                                    <div className="metric-info">
                                        <h3><i className="fas fa-exclamation-triangle"></i> إجمالي المتبقي</h3>
                                        <p>{formatNumber(metrics.totalRemaining, true)}</p>
                                    </div>
                                    <i className="metric-icon fas fa-receipt"></i>
                                </div>
                                
                                <div className="metric-card">
                                    <div className="metric-info">
                                        <h3><i className="fas fa-percent"></i> معدل التحصيل</h3>
                                        <p>{metrics.collectionRate.toFixed(2)}%</p>
                                    </div>
                                    <i className="metric-icon fas fa-chart-pie"></i>
                                </div>
                            </div>
                            
                            {/* التنبيهات */}
                            {showAlerts && (
                                <div className="alert-section">
                                    <div className="section-header">
                                        <h2><i className="fas fa-exclamation-circle"></i> التنبيهات</h2>
                                    </div>
                                    
                                    <div className="alerts-list">
                                        {filteredData
                                            .filter((row, idx) => idx >= 2 && idx < filteredData.length - 1 && (parseFloat(row[12]) || 0) > 5000)
                                            .slice(0, 5)
                                            .map((row, index) => (
                                                <div key={index} className="alert-item error">
                                                    <i className="fas fa-exclamation-triangle"></i>
                                                    <span>المشترك <strong>{row[1]}</strong> متبقي عليه <strong>{formatNumber(row[12], true)} ر.س</strong></span>
                                                </div>
                                            ))}
                                        
                                        {filteredData.length <= 3 && (
                                            <div className="alert-item info">
                                                <i className="fas fa-info-circle"></i>
                                                <span>لا توجد تنبيهات حالياً</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* عرض البيانات حسب نوع الجهاز */}
                            <div className="data-table-section">
                                <div className="section-header">
                                    <h2>
                                        <i className="fas fa-table"></i> بيانات المشتركين
                                        <span className="view-mode-indicator">
                                            {isMobileView ? ' (عرض البطاقات)' : ' (عرض الجدول)'}
                                        </span>
                                    </h2>
                                    <div className="results-count">
                                        <i className="fas fa-users"></i>
                                        <span>عدد النتائج: {filteredData.length > 2 ? filteredData.length - 3 : 0}</span>
                                    </div>
                                </div>
                                
                                {/* عرض البطاقات على الموبايل */}
                                {isMobileView && filteredData.length > 2 ? (
                                    <div className="mobile-cards-view">
                                        {filteredData
                                            .slice(2, filteredData.length - 1)
                                            .map((subscriber, index) => (
                                                <MobileSubscriberCard
                                                    key={index}
                                                    subscriber={subscriber}
                                                    index={index}
                                                    onEdit={handleCellEdit}
                                                    userPermissions={user.permissions}
                                                    startVoiceInput={startVoiceInput}
                                                    addNotification={addNotification}
                                                />
                                            ))}
                                        
                                        {filteredData.length <= 3 && (
                                            <div className="no-data-message">
                                                <i className="fas fa-search"></i>
                                                <p>لا توجد نتائج للبحث الحالي</p>
                                                <p>حاول تغيير كلمة البحث أو إزالة المرشحات</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* عرض الجدول على الكمبيوتر */
                                    <div className="table-responsive-container">
                                        <table className="data-table">
                                            <thead className="sticky-header">
                                                <tr>
                                                    {COLUMN_HEADERS.map(col => (
                                                        <th key={col.letter} style={{ width: col.width }}>
                                                            <i className={col.icon}></i> {col.letter}<br/>
                                                            <span>{col.label}</span>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredData.slice(2, filteredData.length - 1).map((row, rowIndex) => (
                                                    <tr key={rowIndex}>
                                                        {COLUMN_HEADERS.map((col, colIndex) => (
                                                            <td key={colIndex} className={`
                                                                ${colIndex === 0 ? 'col-a-bg' : ''}
                                                                ${colIndex === 1 ? 'col-b-bg' : ''}
                                                                ${colIndex === 1 ? 'name-cell' : ''}
                                                                ${colIndex >= 2 && colIndex <= 12 ? 'number-cell' : ''}
                                                                ${(parseFloat(row[5]) || 0) > 0 && colIndex === 5 ? 'high-consumption' : ''}
                                                                ${(parseFloat(row[12]) || 0) >= 5000 && colIndex === 12 ? 'late-balance' : ''}
                                                                ${canEditCell(colIndex) ? 'editable-column' : ''}
                                                            `}>
                                                                {col.editable && canEditCell(colIndex) ? (
                                                                    <div className="editable-cell-container">
                                                                        {colIndex === 3 ? (
                                                                            <>
                                                                                <input
                                                                                    type="number"
                                                                                    value={row[colIndex] || ''}
                                                                                    onChange={(e) => {
                                                                                        const newValue = e.target.value;
                                                                                        const prev = parseFloat(row[2]) || 0;
                                                                                        const current = parseFloat(newValue) || 0;
                                                                                        
                                                                                        if (current < prev) {
                                                                                            addNotification(`خطأ: القراءة الحالية لا يمكن أن تكون أقل من ${prev}`, 'error');
                                                                                            return;
                                                                                        }
                                                                                        if (current > prev + 30) {
                                                                                            addNotification(`تحذير: الاستهلاك لا يمكن أن يتجاوز 30 وحدة`, 'warning');
                                                                                            return;
                                                                                        }
                                                                                        
                                                                                        handleCellEdit(rowIndex, colIndex, newValue);
                                                                                    }}
                                                                                    className={`editable-cell ${
                                                                                        row[colIndex] < row[2] ? 'invalid-reading' :
                                                                                        row[colIndex] > (parseFloat(row[2]) || 0) + 30 ? 'warning-reading' :
                                                                                        'valid-reading'
                                                                                    }`}
                                                                                    placeholder=""
                                                                                    min={parseFloat(row[2]) || 0}
                                                                                    max={(parseFloat(row[2]) || 0) + 30}
                                                                                />
                                                                                <div className="reading-range-hint">
                                                                                    النطاق: {row[2] || 0} - {(parseFloat(row[2]) || 0) + 30}
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                value={row[colIndex] || ''}
                                                                                onChange={(e) => handleCellEdit(rowIndex, colIndex, e.target.value)}
                                                                                className="editable-cell"
                                                                                placeholder=""
                                                                                onBlur={(e) => handleCellEdit(rowIndex, colIndex, e.target.value)}
                                                                            />
                                                                        )}
                                                                        {(colIndex === 3 || colIndex === 10 || colIndex === 11 || colIndex === 13) && (
                                                                            <button 
                                                                                className="cell-microphone-btn"
                                                                                onClick={() => startVoiceInput(rowIndex, colIndex)}
                                                                                title="إدخال صوتي"
                                                                                type="button"
                                                                            >
                                                                                <i className={`fas fa-microphone ${isListeningCell && currentEditingCell.row === rowIndex && currentEditingCell.col === colIndex ? 'listening' : ''}`}></i>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    formatNumber(row[colIndex], false, colIndex)
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                            
                                            {/* صف الإجمالي المثبت */}
                                            {filteredData.length > 0 && (
                                                <tfoot>
                                                    <tr className="sticky-total">
                                                        {COLUMN_HEADERS.map((col, colIndex) => {
                                                            if (colIndex === 0) return <td key={colIndex}>الإجمالي</td>;
                                                            if (colIndex === 1) return <td key={colIndex}>-</td>;
                                                            if (colIndex === 13) return <td key={colIndex}>-</td>;
                                                            
                                                            const total = filteredData[filteredData.length - 1][colIndex];
                                                            return (
                                                                <td key={colIndex} className="number-cell">
                                                                    {formatNumber(total, false, colIndex)}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                        
                                        {loading && (
                                            <div className="table-loading">
                                                <i className="fas fa-spinner fa-spin"></i> جاري تحميل البيانات...
                                            </div>
                                        )}
                                        
                                        {!loading && filteredData.length <= 3 && (
                                            <div className="no-data">
                                                <i className="fas fa-database"></i>
                                                <p>لا توجد بيانات لعرضها</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* محتوى تقرير القرى الشهري */}
                    {activeFeature === 'monthly-report' && (
                        <div id="monthly-report-content">
                            <div className="monthly-report-placeholder">
                                <h2><i className="fas fa-chart-line"></i> تقرير القرى الشهري</h2>
                                <p>هذه الميزة قيد التطوير وسيتم إضافتها قريباً</p>
                                <div className="coming-soon">
                                    <i className="fas fa-tools fa-3x"></i>
                                    <p>جاري العمل على تقارير القرى المتكاملة</p>
                                    <button 
                                        className="action-btn" 
                                        onClick={() => setActiveFeature('dashboard')}
                                    >
                                        العودة للوحة التحكم
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* الفوتر */}
                    <footer className="main-footer">
                        <div className="footer-info">
                            <p>© 2024 مشروع مياه السوفعي | النظام المتقدم مع الذاكرة الذكية</p>
                            <div className="system-status">
                                <span>القرية: <strong>{village}</strong></span>
                                <span>الشهر: <strong>{month}</strong></span>
                                <span>المستخدم: <strong>{user.name}</strong></span>
                                <span>آخر تحديث: <strong>{metrics.lastUpdated}</strong></span>
                                <span>حالة الذاكرة: <strong>{memoryManager.calculateCacheHitRate().toFixed(1)}% نجاح</strong></span>
                            </div>
                        </div>
                    </footer>
                </main>
            </div>
            
            {/* إضافة تنسيقات CSS مباشرة في الملف */}
            <style jsx>{`
                /* ===== تثبيت الرأس والإجمالي ===== */
                
                .table-responsive-container {
                    max-height: 70vh;
                    overflow: auto;
                    position: relative;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    background: white;
                }
                
                .dark .table-responsive-container {
                    border-color: #4a5568;
                    background: #2d3748;
                }
                
                .sticky-header th {
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    background: linear-gradient(135deg, #0077b6, #023e8a) !important;
                    color: white !important;
                    white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    border-bottom: 2px solid #005f8a;
                    font-weight: bold;
                }
                
                .sticky-header th i {
                    color: #90e0ef !important;
                }
                
                .sticky-total {
                    position: sticky;
                    bottom: 0;
                    z-index: 10;
                    background: linear-gradient(135deg, #f39c12, #e67e22) !important;
                    color: white !important;
                    font-weight: bold;
                    box-shadow: 0 -2px 8px rgba(0,0,0,0.2);
                    border-top: 2px solid #d68910;
                }
                
                .sticky-total td {
                    background: transparent !important;
                    color: white !important;
                    font-size: 14px;
                    font-weight: bold;
                    text-align: center;
                }
                
                .sticky-total td:first-child {
                    font-size: 16px;
                    text-align: right;
                    padding-right: 20px;
                }
                
                .data-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                }
                
                .data-table th {
                    padding: 12px 8px;
                    text-align: center;
                    font-size: 13px;
                    transition: all 0.3s ease;
                }
                
                .data-table th:hover {
                    background: linear-gradient(135deg, #0096c7, #0077b6) !important;
                }
                
                .data-table td {
                    padding: 10px 8px;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                .dark .data-table td {
                    border-bottom: 1px solid #4a5568;
                }
                
                .data-table tr:hover td {
                    background-color: rgba(0, 119, 182, 0.05);
                }
                
                .dark .data-table tr:hover td {
                    background-color: rgba(0, 119, 182, 0.1);
                }
                
                /* ===== تنسيقات زر الميكروفون في الخلايا القابلة للتعديل ===== */
                
                .editable-cell-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    min-height: 40px;
                }
                
                .cell-microphone-btn {
                    position: absolute;
                    left: 5px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: linear-gradient(135deg, #2196F3, #1976D2);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    z-index: 100;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                }
                
                .cell-microphone-btn:hover {
                    background: linear-gradient(135deg, #1976D2, #1565C0);
                    transform: translateY(-50%) scale(1.1);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                }
                
                .cell-microphone-btn:active {
                    transform: translateY(-50%) scale(0.95);
                }
                
                .cell-microphone-btn .fa-microphone.listening {
                    color: #FF5722;
                    animation: microphone-pulse 1.5s infinite;
                }
                
                @keyframes microphone-pulse {
                    0% {
                        transform: scale(1);
                        color: #FF5722;
                    }
                    50% {
                        transform: scale(1.2);
                        color: #FF0000;
                    }
                    100% {
                        transform: scale(1);
                        color: #FF5722;
                    }
                }
                
                .editable-cell {
                    padding-left: 45px !important;
                    width: calc(100% - 10px);
                    height: 36px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    font-size: 14px;
                    text-align: right;
                    background: white;
                    transition: border-color 0.3s ease;
                }
                
                .editable-cell:focus {
                    border-color: #2196F3;
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
                }
                
                /* ===== أنماط نظام التحقق الذكي ===== */
                
                .reading-validation-hint {
                    margin-top: 5px;
                    padding: 4px 8px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                
                .reading-validation-hint .fa-check-circle.valid {
                    color: #28a745;
                }
                
                .reading-validation-hint .fa-exclamation-circle.invalid {
                    color: #dc3545;
                }
                
                .reading-range-hint {
                    position: absolute;
                    top: -25px;
                    right: 0;
                    background: #fff;
                    border: 1px solid #ddd;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 11px;
                    color: #666;
                    white-space: nowrap;
                    opacity: 0;
                    transition: opacity 0.3s;
                    pointer-events: none;
                    z-index: 1000;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                
                .editable-cell-container:hover .reading-range-hint {
                    opacity: 1;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                
                .invalid-reading {
                    animation: shake 0.5s ease;
                    border-color: #dc3545 !important;
                    background-color: rgba(220, 53, 69, 0.1) !important;
                }
                
                .valid-reading {
                    border-color: #28a745 !important;
                    background-color: rgba(40, 167, 69, 0.1) !important;
                }
                
                .warning-reading {
                    border-color: #ffc107 !important;
                    background-color: rgba(255, 193, 7, 0.1) !important;
                }
                
                /* تنسيقات للهاتف المحمول */
                .editable-cell-with-mic {
                    position: relative;
                    display: flex;
                    align-items: center;
                    margin-top: 5px;
                }
                
                .editable-cell-with-mic .editable-input {
                    flex: 1;
                    padding-right: 45px;
                    height: 40px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    font-size: 16px;
                }
                
                .editable-cell-with-mic .cell-microphone-btn {
                    position: absolute;
                    left: 5px;
                    background: linear-gradient(135deg, #4CAF50, #388E3C);
                    width: 36px;
                    height: 36px;
                }
                
                .editable-cell-with-mic .paid-input {
                    border-color: #4CAF50;
                }
                
                .notes-with-mic {
                    position: relative;
                    margin-top: 5px;
                }
                
                .notes-input {
                    width: 100%;
                    padding: 10px 45px 10px 10px;
                    border: 2px solid #9C27B0;
                    border-radius: 8px;
                    font-size: 14px;
                    resize: vertical;
                    min-height: 60px;
                    text-align: right;
                }
                
                .notes-microphone-btn {
                    position: absolute;
                    left: 10px;
                    bottom: 10px;
                    background: linear-gradient(135deg, #9C27B0, #7B1FA2);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    transition: all 0.3s ease;
                }
                
                .notes-microphone-btn:hover {
                    background: linear-gradient(135deg, #7B1FA2, #6A1B9A);
                    transform: scale(1.1);
                }
                
                .editable-column {
                    position: relative;
                    padding: 8px 5px !important;
                    background-color: rgba(33, 150, 243, 0.05) !important;
                }
                
                .editable-column:hover {
                    background-color: rgba(33, 150, 243, 0.1) !important;
                }
                
                td:nth-child(4) .cell-microphone-btn {
                    background: linear-gradient(135deg, #FF9800, #F57C00);
                }
                
                td:nth-child(4) .cell-microphone-btn:hover {
                    background: linear-gradient(135deg, #F57C00, #E65100);
                }
                
                td:nth-child(11) .cell-microphone-btn {
                    background: linear-gradient(135deg, #9C27B0, #7B1FA2);
                }
                
                td:nth-child(11) .cell-microphone-btn:hover {
                    background: linear-gradient(135deg, #7B1FA2, #6A1B9A);
                }
                
                td:nth-child(12) .cell-microphone-btn {
                    background: linear-gradient(135deg, #4CAF50, #388E3C);
                }
                
                td:nth-child(12) .cell-microphone-btn:hover {
                    background: linear-gradient(135deg, #388E3C, #2E7D32);
                }
                
                td:nth-child(14) .cell-microphone-btn {
                    background: linear-gradient(135deg, #9C27B0, #7B1FA2);
                }
                
                td:nth-child(14) .cell-microphone-btn:hover {
                    background: linear-gradient(135deg, #7B1FA2, #6A1B9A);
                }
                
                .voice-input-active {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 20px 30px;
                    border-radius: 15px;
                    z-index: 9999;
                    text-align: center;
                    animation: voice-modal 0.3s ease;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                }
                
                @keyframes voice-modal {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -40%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
                
                .voice-input-active .mic-animation {
                    font-size: 48px;
                    color: #FF5722;
                    margin-bottom: 15px;
                    animation: mic-wave 1.5s infinite;
                }
                
                @keyframes mic-wave {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.2);
                        opacity: 0.8;
                    }
                }
                
                .voice-input-hint {
                    margin-top: 10px;
                    padding: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 5px;
                    font-size: 12px;
                }
                
                /* ===== لوحة مراقبة القراءات الذكية ===== */
                .smart-reading-monitor {
                    background: white;
                    border: 2px solid #e9ecef;
                    border-radius: 10px;
                    padding: 15px;
                    margin-top: 20px;
                    margin-bottom: 20px;
                }
                
                .dark .smart-reading-monitor {
                    background: #2d3748;
                    border-color: #4a5568;
                }
                
                .monitor-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e9ecef;
                }
                
                .dark .monitor-header {
                    border-bottom-color: #4a5568;
                }
                
                .status-indicator {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 14px;
                }
                
                .status-indicator.excellent {
                    background: #d4edda;
                    color: #155724;
                }
                
                .status-indicator.good {
                    background: #fff3cd;
                    color: #856404;
                }
                
                .status-indicator.poor {
                    background: #f8d7da;
                    color: #721c24;
                }
                
                .reading-stats {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-bottom: 15px;
                }
                
                .stat-row {
                    display: flex;
                    gap: 15px;
                }
                
                .stat-item {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    background: #f8f9fa;
                    border-radius: 6px;
                }
                
                .dark .stat-item {
                    background: #4a5568;
                }
                
                .stat-item .warning {
                    color: #dc3545;
                }
                
                .anomalies-section {
                    border-top: 2px solid #e9ecef;
                    padding-top: 15px;
                }
                
                .anomalies-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-top: 10px;
                }
                
                .anomaly-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 10px;
                    border-radius: 6px;
                    animation: fadeIn 0.3s ease;
                }
                
                .anomaly-item.critical {
                    background: #f8d7da;
                    border-left: 4px solid #dc3545;
                }
                
                .anomaly-item.high {
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                }
                
                .anomaly-item.medium {
                    background: #d1ecf1;
                    border-left: 4px solid #17a2b8;
                }
                
                .anomaly-details {
                    flex: 1;
                }
                
                .anomaly-details strong {
                    display: block;
                    margin-bottom: 3px;
                }
                
                .anomaly-details p {
                    margin: 0;
                    font-size: 13px;
                    color: #666;
                }
                
                .more-anomalies {
                    text-align: center;
                    padding: 10px;
                    color: #6c757d;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                
                /* تنسيقات البحث الذكي المركب */
                .smart-search-system {
                    width: 100%;
                    margin-bottom: 20px;
                }
                
                .search-bar-container {
                    position: relative;
                    margin-bottom: 15px;
                }
                
                .search-main-bar {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    background: white;
                    border-radius: 12px;
                    padding: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    border: 2px solid #e0e0e0;
                    transition: all 0.3s ease;
                }
                
                .dark .search-main-bar {
                    background: #2d3748;
                    border-color: #4a5568;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }
                
                .search-main-bar:focus-within {
                    border-color: #0077b6;
                    box-shadow: 0 4px 20px rgba(0, 119, 182, 0.2);
                }
                
                .village-selector-search {
                    flex-shrink: 0;
                }
                
                .village-search-select {
                    padding: 10px 15px;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    background: white;
                    color: #333;
                    font-weight: 500;
                    min-width: 140px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .dark .village-search-select {
                    background: #4a5568;
                    border-color: #718096;
                    color: #e2e8f0;
                }
                
                .village-search-select:focus {
                    outline: none;
                    border-color: #0077b6;
                }
                
                .search-input-wrapper {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 5px;
                    position: relative;
                }
                
                .dark .search-input-wrapper {
                    background: #4a5568;
                }
                
                .search-icon {
                    padding: 0 12px;
                    color: #6c757d;
                }
                
                .smart-search-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    padding: 10px;
                    font-size: 16px;
                    color: #333;
                    min-width: 200px;
                }
                
                .dark .smart-search-input {
                    color: #e2e8f0;
                }
                
                .smart-search-input:focus {
                    outline: none;
                }
                
                .smart-search-input::placeholder {
                    color: #6c757d;
                    opacity: 0.8;
                }
                
                .search-action-buttons {
                    display: flex;
                    gap: 8px;
                    margin-left: 10px;
                }
                
                .search-action-buttons button {
                    background: none;
                    border: none;
                    padding: 8px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .search-clear-btn {
                    color: #dc3545;
                    background: rgba(220, 53, 69, 0.1) !important;
                }
                
                .search-clear-btn:hover {
                    background: rgba(220, 53, 69, 0.2) !important;
                    transform: scale(1.1);
                }
                
                .voice-search-btn {
                    color: #0077b6;
                    background: rgba(0, 119, 182, 0.1) !important;
                }
                
                .voice-search-btn.listening {
                    color: #ff5722;
                    background: rgba(255, 87, 34, 0.2) !important;
                    animation: pulse 1.5s infinite;
                }
                
                .voice-search-btn:hover {
                    background: rgba(0, 119, 182, 0.2) !important;
                    transform: scale(1.1);
                }
                
                .advanced-filters-toggle {
                    color: #6f42c1;
                    background: rgba(111, 66, 193, 0.1) !important;
                }
                
                .advanced-filters-toggle:hover {
                    background: rgba(111, 66, 193, 0.2) !important;
                    transform: scale(1.1);
                }
                
                /* مؤشر البحث الصوتي */
                .voice-search-indicator {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: linear-gradient(135deg, #0077b6, #023e8a);
                    color: white;
                    padding: 10px 15px;
                    border-radius: 0 0 8px 8px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 2px;
                    z-index: 1000;
                    animation: slideDown 0.3s ease;
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .voice-animation {
                    display: flex;
                    gap: 3px;
                    align-items: center;
                }
                
                .voice-bar {
                    width: 3px;
                    height: 20px;
                    background: white;
                    border-radius: 3px;
                    animation: voiceBars 1s infinite;
                }
                
                .voice-bar:nth-child(1) { animation-delay: 0.1s; }
                .voice-bar:nth-child(2) { animation-delay: 0.2s; }
                .voice-bar:nth-child(3) { animation-delay: 0.3s; }
                
                @keyframes voiceBars {
                    0%, 100% { height: 10px; }
                    50% { height: 20px; }
                }
                
                /* المرشحات المتقدمة */
                .advanced-filters-panel {
                    background: white;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 15px;
                    margin-top: 10px;
                    animation: slideUp 0.3s ease;
                }
                
                .dark .advanced-filters-panel {
                    background: #2d3748;
                    border-color: #4a5568;
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .filters-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 15px;
                }
                
                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                
                .filter-group label {
                    font-weight: 500;
                    color: #333;
                    font-size: 14px;
                }
                
                .dark .filter-group label {
                    color: #e2e8f0;
                }
                
                .filter-group select {
                    padding: 8px 12px;
                    border: 2px solid #e0e0e0;
                    border-radius: 6px;
                    background: white;
                    color: #333;
                }
                
                .dark .filter-group select {
                    background: #4a5568;
                    border-color: #718096;
                    color: #e2e8f0;
                }
                
                .amount-range {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                
                .range-input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 2px solid #e0e0e0;
                    border-radius: 6px;
                    text-align: center;
                }
                
                .dark .range-input {
                    background: #4a5568;
                    border-color: #718096;
                    color: #e2e8f0;
                }
                
                .filters-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                
                .apply-filters-btn, .clear-filters-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                }
                
                .apply-filters-btn {
                    background: linear-gradient(135deg, #28a745, #218838);
                    color: white;
                }
                
                .apply-filters-btn:hover {
                    background: linear-gradient(135deg, #218838, #1e7e34);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
                }
                
                .clear-filters-btn {
                    background: linear-gradient(135deg, #dc3545, #c82333);
                    color: white;
                }
                
                .clear-filters-btn:hover {
                    background: linear-gradient(135deg, #c82333, #bd2130);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
                }
                
                /* أوامر صوتية سريعة */
                .quick-voice-commands {
                    margin: 15px 0;
                    padding: 15px;
                    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                    border-radius: 10px;
                    text-align: center;
                }
                
                .dark .quick-voice-commands {
                    background: linear-gradient(135deg, #4a5568, #2d3748);
                }
                
                .hint-text {
                    color: #666;
                    font-size: 14px;
                }
                
                .dark .hint-text {
                    color: #e2e8f0;
                }
                
                /* تحسينات للوضع الداكن */
                .dark .editable-cell {
                    background: #2d3748;
                    border-color: #4a5568;
                    color: #e2e8f0;
                }
                
                .dark .cell-microphone-btn {
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
                }
                
                .dark .editable-column {
                    background-color: rgba(66, 153, 225, 0.1) !important;
                }
                
                /* تحسينات للاستجابة */
                @media (max-width: 768px) {
                    .table-responsive-container {
                        max-height: 60vh;
                    }
                    
                    .cell-microphone-btn {
                        width: 36px;
                        height: 36px;
                    }
                    
                    .editable-cell {
                        padding-left: 50px !important;
                        height: 40px;
                        font-size: 16px;
                    }
                    
                    .editable-cell-with-mic .cell-microphone-btn {
                        width: 40px;
                        height: 40px;
                    }
                    
                    .notes-microphone-btn {
                        width: 40px;
                        height: 40px;
                    }
                    
                    .sticky-header th {
                        padding: 10px 6px;
                        font-size: 12px;
                    }
                    
                    .sticky-total td {
                        font-size: 13px;
                    }
                    
                    .stat-row {
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .search-main-bar {
                        flex-direction: column;
                    }
                    
                    .village-selector-search,
                    .search-input-wrapper {
                        width: 100%;
                    }
                    
                    .search-action-buttons {
                        width: 100%;
                        justify-content: space-around;
                    }
                    
                    .filters-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .filters-actions {
                        flex-direction: column;
                    }
                    
                    .apply-filters-btn,
                    .clear-filters-btn {
                        width: 100%;
                        justify-content: center;
                    }
                }
                
                /* شريط التمرير */
                .table-responsive-container::-webkit-scrollbar {
                    width: 10px;
                    height: 10px;
                }
                
                .table-responsive-container::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 5px;
                }
                
                .table-responsive-container::-webkit-scrollbar-thumb {
                    background: #0077b6;
                    border-radius: 5px;
                }
                
                .table-responsive-container::-webkit-scrollbar-thumb:hover {
                    background: #005f8a;
                }
                
                .dark .table-responsive-container::-webkit-scrollbar-track {
                    background: #4a5568;
                }
                
                .dark .table-responsive-container::-webkit-scrollbar-thumb {
                    background: #f39c12;
                }
                
                .dark .table-responsive-container::-webkit-scrollbar-thumb:hover {
                    background: #e67e22;
                }
            `}</style>
        </div>
    );
    
    // ===== وظائف مساعدة =====
    const toggleTheme = () => {
        const themes = ['light', 'dark', 'high-contrast'];
        const currentIndex = themes.indexOf(theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        setTheme(nextTheme);
        localStorage.setItem('waterAppTheme', nextTheme);
        
        if (user) {
            memoryManager.updateUserHabits(user.name, 'change_theme', { 
                from: theme, 
                to: nextTheme 
            });
        }
    };
    
    const exportData = (format = 'excel') => {
        if (!user || !user.permissions.export) {
            addNotification("ليس لديك صلاحية للتصدير", "warning");
            return;
        }
        
        let exportData;
        switch(format) {
            case 'excel':
                exportData = `data:text/csv;charset=utf-8,${encodeURIComponent(convertToCSV(data))}`;
                break;
            case 'json':
                exportData = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
                break;
            default:
                return;
        }
        
        const link = document.createElement('a');
        link.href = exportData;
        link.download = `water_data_${village}_${month}_${Date.now()}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addNotification(`تم تصدير البيانات بصيغة ${format.toUpperCase()}`, 'success');
    };
    
    const createBackup = () => {
        if (!user || !user.permissions.backup) {
            addNotification("ليس لديك صلاحية لإنشاء نسخة احتياطية", "warning");
            return;
        }
        
        const backup = {
            village,
            month,
            data,
            metrics,
            user: user.name,
            timestamp: new Date().toISOString(),
            version: '2.0'
        };
        
        const backupData = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
        const link = document.createElement('a');
        link.href = backupData;
        link.download = `backup_${village}_${month}_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addNotification('تم إنشاء نسخة احتياطية', 'success');
    };
    
    // دالة مساعدة لتحويل البيانات لـ CSV
    const convertToCSV = (dataArray) => {
        if (!dataArray || !dataArray.length) return '';
        
        const headers = COLUMN_HEADERS.map(col => col.label);
        const rows = dataArray.slice(2, dataArray.length - 1);
        
        const csvRows = [
            headers.join(','),
            ...rows.map(row => 
                row.map(cell => {
                    const cellValue = cell || '';
                    return `"${String(cellValue).replace(/"/g, '""')}"`;
                }).join(',')
            )
        ];
        
        return csvRows.join('\n');
    };
};

export default App;