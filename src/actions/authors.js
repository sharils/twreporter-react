'use strict'

import * as ALGOLIA from '../constants/algolia'
import * as CONSTANTS from '../constants/index'

import { arrayOf, normalize } from 'normalizr'

import { REQUEST_PAGE_START_FROM, MAX_RESULTS_PER_FETCH, RETURN_DELAY } from '../constants/authors-list'
import algoliasearch from 'algoliasearch'
import { author as authorSchema } from '../schemas/index'
import { camelizeKeys } from 'humps'
import get from 'lodash/get'

const _ = {
  get
}

export function requestSearchAuthors(keyWords) {
  return {
    type: CONSTANTS.SEARCH_AUTHORS_REQUEST,
    keyWords: keyWords
  }
}

export function failToSearchAuthors(error, failedAt) {
  return {
    type: CONSTANTS.SEARCH_AUTHORS_FAILURE,
    error,
    failedAt
  }
}

export function receiveSearchAuthors(keyWords, response, currentPage, isFinish, receivedAt) {
  return {
    type: CONSTANTS.SEARCH_AUTHORS_SUCCESS,
    keyWords,
    response: response,
    authorsInList: response.result,
    currentPage,
    isFinish,
    receivedAt
  }
}

export function searchAuthors(targetPage = REQUEST_PAGE_START_FROM, returnDelay = 0, keyWords='', maxResults = MAX_RESULTS_PER_FETCH) {
  return (dispatch, getState) => { // eslint-disable-line no-unused-vars
    const searchParas = {
      hitsPerPage: maxResults,
      page: targetPage
    }
    let client = algoliasearch(ALGOLIA.APP_ID, ALGOLIA.SEARCH_API_KEY)
    let index = client.initIndex(ALGOLIA.CONTACTS_INDEX)
    dispatch(requestSearchAuthors(keyWords))
    return index.search(keyWords, searchParas)
      .then(function searchSuccess(content) {
        const hits = _.get(content, 'hits', {})
        const camelizedJson = camelizeKeys(hits)
        let response = normalize(camelizedJson, arrayOf(authorSchema))
        const currentPage = content.page
        const isFinish = ( currentPage >= content.nbPages - 1 )
        const receivedAt = Date.now()
        function delayDispatch() {
          return new Promise((resolve, reject)=> { // eslint-disable-line no-unused-vars
            setTimeout(() => {
              resolve()
            }, 1000)
          })
        }
        return delayDispatch().then(()=>{
          return dispatch(receiveSearchAuthors(keyWords, response, currentPage, isFinish, receivedAt))
        })
      }
      )
      .catch(function searchFailure(error) {
        let failedAt = Date.now()
        return dispatch(failToSearchAuthors(error, failedAt))
      })
  }
}

export function fetchAuthorsIfNeeded() {
  return (dispatch, getState) => {
    const state = getState()
    const isFetching  = _.get(state, 'authorsList.isFetching', false)
    const isFinish    = _.get(state, 'authorsList.isFinish', false)
    const currentPage = _.get(state, 'authorsList.currentPage', REQUEST_PAGE_START_FROM -1)
    const targetPage  = currentPage + 1
    const returnDelay = currentPage < REQUEST_PAGE_START_FROM ? 0 : RETURN_DELAY
    if (!isFetching && !isFinish) {
      return dispatch(searchAuthors(targetPage, returnDelay))
    }
    return
  }
}
