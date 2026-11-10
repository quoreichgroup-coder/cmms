package com.grash.service;

import com.grash.model.Currency;
import com.grash.repository.CurrencyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrencyDefaultTest {
    @Mock private CurrencyRepository currencyRepository;
    @InjectMocks private CurrencyService currencyService;

    @Test
    void newCompaniesGetTheConfiguredCurrency() {
        ReflectionTestUtils.setField(currencyService, "defaultCurrencyCode", "XOF");
        Currency xof = new Currency();
        when(currencyRepository.findByCode("XOF")).thenReturn(Optional.of(xof));

        assertSame(xof, currencyService.defaultForNewCompany());
    }

    @Test
    void unknownConfiguredCurrencyFallsBackToTheDollarSeed() {
        ReflectionTestUtils.setField(currencyService, "defaultCurrencyCode", "ZZZ");
        Currency dollar = new Currency();
        when(currencyRepository.findByCode("ZZZ")).thenReturn(Optional.empty());
        when(currencyRepository.findByCode("$")).thenReturn(Optional.of(dollar));

        assertSame(dollar, currencyService.defaultForNewCompany());
    }
}
